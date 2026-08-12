# Publicando o PetWatch

O projeto tem duas partes que são publicadas separadamente:

1. **Frontend (React)** — câmera, detecção de movimento, gravação, alertas. 100% roda no
   navegador de cada visitante. Vai para o **Vercel**.
2. **Servidor de sinalização** (`server/signal.js`) — só é necessário para o recurso de
   pareamento remoto (assistir pelo celular). Não guarda vídeo, só troca metadados de conexão
   (SDP/ICE) entre o computador da câmera e quem está assistindo. Precisa rodar em algum lugar
   com WebSocket persistente — **Vercel não serve para isso**, use Fly.io, Render ou uma VPS
   qualquer.

Se você não quiser o pareamento remoto publicado, pule a parte 2 — o app funciona sozinho no
Vercel sem ele (grava localmente, sem servidor nenhum).

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

## 2. Servidor de sinalização (Fly.io — exemplo)

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

## 3. Frontend no Vercel

1. Importe o repositório no [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite** (detecta sozinho).
3. Em *Environment Variables*, adicione:
   - `VITE_SIGNAL_URL` = `wss://petwatch-signal.fly.dev` (a URL do passo 2)
   - `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` (opcional, veja abaixo)
4. Deploy.
5. Volte no servidor de sinalização e confirme que `ALLOWED_ORIGINS` bate exatamente com a URL
   final do Vercel (ex: `https://petwatch.vercel.app`, sem barra no final).

## 4. TURN (opcional, mas recomendado para uso "de qualquer lugar")

Sem TURN, o pareamento remoto só funciona de forma confiável quando os dois lados conseguem se
enxergar diretamente (mesma rede, ou redes com NAT simples). Para funcionar de qualquer lugar
(dados móveis, redes corporativas, etc.), você precisa de um servidor TURN.

Opções rápidas: [metered.ca](https://www.metered.ca/tools/openrelay/) tem um tier gratuito,
Twilio Network Traversal Service, ou rode seu próprio [coturn](https://github.com/coturn/coturn).
Coloque as credenciais em `VITE_TURN_URL` / `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL`.

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
