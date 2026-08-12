# 📷 PetWatch

**Transforme qualquer PC ou celular velho em câmera de segurança, direto no navegador.**

Nem todo mundo pode comprar uma câmera de segurança de verdade. O PetWatch nasceu de um
problema simples: usar a webcam do computador pra vigiar o pet enquanto você sai de casa, mas
com uma experiência de verdade — detecção de movimento, gravação automática, alertas, várias
câmeras, e até acompanhar de qualquer lugar pelo celular.

100% open source, 100% gratuito, sem cadastro, sem nuvem paga. Se dá pra abrir um navegador,
dá pra virar uma câmera.

## O que dá pra fazer

- 🎥 **Usar a webcam de um PC ou o celular como câmera** — qualquer aparelho com navegador e
  câmera serve.
- 🕵️ **Detecção de movimento** direto no navegador (comparação de frames via `canvas`, sem
  mandar nada pra fora).
- ⏺️ **Gravação automática de clipes** quando detecta movimento, salvos localmente no próprio
  navegador (IndexedDB) — nada sobe pra servidor nenhum.
- 📡 **Múltiplas câmeras** numa grade só, tipo central de monitoramento.
- 🔔 **Alertas sonoros e notificações push** quando algo se mexe.
- 🎙️ **Fala com o pet** — segura um botão e sua voz sai nas caixas de som do outro lado.
- 📱 **Assista de qualquer lugar** pelo celular via WebRTC (peer-to-peer, sem o vídeo passar por
  servidor nenhum) — opcional, veja [DEPLOY.md](DEPLOY.md).
- 🌙 Interface no estilo câmera de segurança de verdade: overlay de timestamp, indicador REC,
  timeline de eventos.

## Por que isso é seguro pra publicar como app público

- A câmera, a detecção de movimento e os clipes gravados **nunca saem do navegador de quem está
  usando**. Não existe backend guardando vídeo de ninguém.
- O recurso opcional de assistir remotamente usa WebRTC: o vídeo viaja direto entre os dois
  aparelhos (ponto a ponto), criptografado. O único servidor envolvido (sinalização) só troca um
  "aperto de mão" inicial — nunca vê o conteúdo do vídeo.
- Códigos de pareamento são gerados pelo servidor (aleatórios, criptográficos), expiram sozinhos
  e têm limite de tentativas — ninguém adivinha o código de outra pessoa.

Detalhes técnicos completos em [DEPLOY.md](DEPLOY.md#o-que-já-está-protegido-contra-vazamento-entre-usuários).

## Rodando localmente

Requer [Node.js](https://nodejs.org/) 18+.

```bash
git clone https://github.com/SEU-USUARIO/pet-cam.git
cd pet-cam
npm install
npm run dev:all
```

Abra `http://localhost:5173`, autorize a câmera e pronto. `dev:all` sobe o app **e** o servidor
de sinalização juntos (necessário só se você quiser testar o pareamento remoto).

Se quiser rodar só o app, sem o pareamento remoto:

```bash
npm run dev
```

## Publicando pra qualquer um usar

Veja o [DEPLOY.md](DEPLOY.md) — tem duas opções passo a passo: Vercel + Fly.io (tiers gratuitos,
zero servidor pra manter) ou tudo na sua própria VPS com domínio (grátis se você já tem a VPS).

## Como funciona por baixo dos panos

- **Frontend**: React + TypeScript + Vite. Toda a câmera, detecção de movimento
  (`requestAnimationFrame` + diff de pixels num canvas escondido), gravação (`MediaRecorder`) e
  armazenamento (`IndexedDB` via `idb-keyval`) roda inteiramente no navegador.
- **Pareamento remoto** (opcional): um servidor Node minúsculo (`server/signal.js`) só faz o
  papel de "recepcionista" — apresenta os dois navegadores um pro outro via WebSocket, e depois
  sai do caminho. A conexão de vídeo/áudio em si é WebRTC direto entre os aparelhos.

## Ideias pra quem quiser contribuir

- Reconhecimento de som (latido, choro) além de movimento
- Zonas de detecção de movimento (ignorar uma área da tela)
- Exportar/baixar clipes em lote
- Modo "câmera antiga" (celular velho vira transmissor, sem interface local)
- Tradução da interface

Pull requests são bem-vindos. É um projeto pequeno e sem burocracia — abre uma issue, discute,
manda o PR.

## Licença

MIT — veja [LICENSE](LICENSE). Use, modifique, redistribua, monte o seu próprio serviço em cima
disso.
