# Publicando o PetWatch

O projeto tem duas partes que são publicadas separadamente:

1. **Frontend (React)** — câmera, detecção de movimento, gravação, alertas. 100% roda no
   navegador de cada visitante.
2. **Servidor de sinalização** (`server/signal.js`) — só é necessário para o recurso de
   pareamento remoto (assistir pelo celular). Não guarda vídeo, só troca metadados de conexão
   (SDP/ICE) entre o computador da câmera e quem está assistindo. Precisa rodar em algum lugar
   com WebSocket persistente.

Se você não quiser o pareamento remoto publicado, pule a parte 2 — o app funciona sozinho sem
ele (grava localmente, sem servidor nenhum).

Duas formas de publicar:

- **Opção A**: Vercel (frontend) + Fly.io/Render (sinalização) — grátis nos tiers gratuitos,
  zero manutenção de servidor.
- **Opção B**: tudo na sua própria VPS com domínio — grátis se você já paga a VPS por outro
  motivo, mas você cuida da manutenção (updates, certificado, etc).

## 1. GitHub

```bash
cd pet-cam
git init
git add .
git commit -m "PetWatch: câmera de segurança para pets no navegador"
git branch -M main
git remote add origin <url-do-seu-repositorio>
git push -u origin main
```

## Opção A: Vercel + Fly.io

### 2. Servidor de sinalização (Fly.io — exemplo)

```bash
cd pet-cam
fly launch --no-deploy   # cria o app, escolha um nome
fly secrets set ALLOWED_ORIGINS=https://SEU-PROJETO.vercel.app
fly deploy
```

Se preferir Render/Railway/uma VPS: basta rodar `node server/signal.js` com as variáveis de
ambiente `ALLOWED_ORIGINS` e opcionalmente `SIGNAL_PORT`. O único requisito é que a plataforma
sirva HTTPS/WSS (a maioria termina TLS automaticamente na borda).

Anote a URL pública, por exemplo `wss://petwatch-signal.fly.dev`.

### 3. Frontend no Vercel

1. Importe o repositório no [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite** (detecta sozinho).
3. Em *Environment Variables*, adicione:
   - `VITE_SIGNAL_URL` = `wss://petwatch-signal.fly.dev` (a URL do passo 2)
   - `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` (opcional, veja abaixo)
4. Deploy.
5. Volte no servidor de sinalização e confirme que `ALLOWED_ORIGINS` bate exatamente com a URL
   final do Vercel (ex: `https://petwatch.vercel.app`, sem barra no final).

## Opção B: tudo na sua VPS (Linux + domínio)

Vamos usar o [Caddy](https://caddyserver.com/) como servidor web — ele tira HTTPS automático via
Let's Encrypt sem você precisar mexer em certificado nenhum, e já sabe fazer proxy de WebSocket
sem configuração extra. Você vai precisar de **dois subdomínios** apontando pro IP da VPS (dois
registros `A` no DNS do seu domínio): um para o site e outro para a sinalização, por exemplo:

```
petwatch.seudominio.com      A   <IP-DA-VPS>
signal.petwatch.seudominio.com   A   <IP-DA-VPS>
```

### 1. Instalar dependências na VPS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### 2. Trazer o código e buildar o frontend

```bash
sudo mkdir -p /var/www/petwatch
sudo chown $USER:$USER /var/www/petwatch
git clone https://github.com/SEU-USUARIO/pet-cam.git /var/www/petwatch
cd /var/www/petwatch
npm ci
```

O build do Vite embute a URL de sinalização em tempo de build — passe ela na frente do comando:

```bash
VITE_SIGNAL_URL=wss://signal.petwatch.seudominio.com npm run build
```

Isso gera `dist/` com o site já apontando pro seu servidor de sinalização.

### 3. Rodar o servidor de sinalização como serviço (systemd)

Crie `/etc/systemd/system/petwatch-signal.service`:

```ini
[Unit]
Description=PetWatch signaling server
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/petwatch
Environment=ALLOWED_ORIGINS=https://petwatch.seudominio.com
Environment=SIGNAL_PORT=8787
# Opcional, só se for usar TURN (veja a seção 4 mais abaixo):
Environment=TURN_API_KEY=sua-api-key-da-metered
Environment=TURN_DOMAIN=petwatch.metered.live
ExecStart=/usr/bin/node server/signal.js
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now petwatch-signal
sudo systemctl status petwatch-signal
```

### 4. Caddyfile (HTTPS automático + proxy do WebSocket)

Edite `/etc/caddy/Caddyfile`:

```
petwatch.seudominio.com {
    root * /var/www/petwatch/dist
    encode gzip
    file_server
}

signal.petwatch.seudominio.com {
    reverse_proxy 127.0.0.1:8787
}
```

```bash
sudo systemctl reload caddy
```

Pronto — abra `https://petwatch.seudominio.com` no navegador. O Caddy já emitiu os certificados
sozinho.

### 5. Trancar a porta do servidor de sinalização

O Node está escutando em todas as interfaces (`0.0.0.0:8787`), e o Caddy faz proxy pra ele —
mas se a porta 8787 continuar acessível direto de fora, alguém poderia falar com o servidor de
sinalização sem passar pelo HTTPS/Caddy. Feche ela no firewall, deixando só 80/443/22 públicas:

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 8787
sudo ufw enable
```

### Atualizando depois de mudanças no código

```bash
cd /var/www/petwatch
git pull
npm ci
VITE_SIGNAL_URL=wss://signal.petwatch.seudominio.com npm run build
sudo systemctl restart petwatch-signal
```

(O frontend não precisa reiniciar nada — o Caddy já serve o `dist/` novo assim que o build
termina.)

## 4. TURN (opcional, mas recomendado para uso "de qualquer lugar")

Sem TURN, o pareamento remoto só funciona de forma confiável quando os dois lados conseguem se
enxergar diretamente (mesma rede, ou redes com NAT simples). Para funcionar de qualquer lugar
(dados móveis, redes corporativas, etc.), você precisa de um servidor TURN.

Opção mais simples: [metered.ca](https://www.metered.ca/tools/openrelay/) tem um plano
**"Global 500MB Plan — no card required"**, sem cartão. Depois de criar a conta, pegue na aba
**Developers** do painel:

- a **API Key**
- o **domínio do seu app** (ex: `petwatch.metered.live`)

⚠️ **Nunca coloque essas duas coisas em variáveis `VITE_*`** — tudo que começa com `VITE_` é
embutido no JavaScript público, então qualquer pessoa que abrir o código-fonte da página
conseguiria copiar sua API key e gastar sua cota. Em vez disso, configure no **servidor de
sinalização** (nunca no Vercel/frontend):

```
TURN_API_KEY=sua-api-key-da-metered
TURN_DOMAIN=petwatch.metered.live
```

O servidor de sinalização busca as credenciais por trás dos panos (`GET /turn-credentials`,
já com rate limit) e devolve pro navegador só o resultado — a API key nunca aparece no
frontend. O frontend não precisa de nenhuma variável de ambiente extra pra isso, já funciona
automaticamente assim que o servidor tiver `TURN_API_KEY`/`TURN_DOMAIN` configurados.

Se preferir outro provedor (Twilio, Xirsys) ou seu próprio
[coturn](https://github.com/coturn/coturn) com usuário/senha fixos, dá pra adaptar a rota
`/turn-credentials` em `server/signal.js` pra devolver esse par fixo em vez de chamar a API da
Metered.

Importante: um relay TURN só repassa bytes criptografados (DTLS-SRTP) — ele não consegue ver o
conteúdo do vídeo — mas ele vê metadados de conexão (IPs, timing). Escolha um provedor em que
confie, ou hospede o seu.

## O que já está protegido contra vazamento entre usuários

- **Código de sala gerado pelo servidor**, aleatório e criptográfico (8 caracteres), nunca pelo
  cliente.
- **Token secreto de host**: só quem criou a sala consegue transmitir nela; o código sozinho
  (que é compartilhável, vai no QR) só permite *assistir*, nunca virar host.
- **Salas expiram sozinhas**: 5 min se ninguém conectar, e a sala fecha os espectadores 2 min
  depois que o host desliga a transmissão (sem reconexão automática de estranhos).
- **Rate limiting** por IP tanto na criação de salas quanto em tentativas de entrar.
- **CORS/Origin restritos** via `ALLOWED_ORIGINS` — o servidor de sinalização recusa conexões de
  qualquer site que não seja o seu.
- **Sinalização não carrega vídeo** — o servidor nunca vê ou grava o stream, só troca o
  "aperto de mão" inicial entre os dois navegadores.

## O que continua sendo uma decisão sua

- Se usar TURN, você está confiando no operador do relay para não abusar dos metadados de
  conexão (não do conteúdo, que é criptografado ponta-a-ponta).
- Compartilhar o código/QR é como compartilhar uma senha temporária — quem tiver o link consegue
  assistir enquanto a transmissão estiver ligada.
