# PortaLink — Interfone de Vídeo

PWA de interfone com vídeo via WebRTC + Firebase Realtime Database. O visitante escaneia um QR na porta, chama o morador, e o morador atende em vídeo pelo celular — com toque de campainha **Ding-Dong de mansão** sintetizado (Web Audio API) e notificação push **mesmo com o app fechado** (Cloud Function + FCM).

## Visão geral

- **Visitante** abre o link do QR → digita o nome → toca em **ChAMAR MORADOR** → câmera + microfone conectam via WebRTC.
- **Morador** recebe a chamada no celular (tela cheia, som de campainha, notificação persistente) → atende em vídeo.
- A sinalização WebRTC (offer/answer/ICE) trafega pelo Firebase Realtime Database — sem servidor próprio além da Cloud Function de push.
- Funciona em **Android, desktop e iPhone** (no iPhone é preciso instalar na tela inicial pra receber push em background).

## Recursos

- **Vídeo bidirecional** via WebRTC (áudio + vídeo), sinalização por Firebase RTDB.
- **Campainha Ding-Dong de mansão** — sino sintetizado com 5 parciais inarmônicas (timbre de sino real), notas Sol5 → Dó5 (4ª justa), volume 130% acima do original, loop a cada 2,6 s. Sem dependência de MP3 externo.
- **Push com app fechado** — Cloud Function vigia o nó `/chamada` e dispara um push via FCM; o Service Worker recebe e mostra a notificação mesmo com o app do morador fechado (Android e desktop).
- **QR em tela cheia** — overlay interno (fundo branco, logo, QR 260 px com borda arredondada, botão Fechar). Não abre site externo.
- **Tela sempre acesa** — Wake Lock API mantém a tela ligada quando o interfone está ativo.
- **Notificação persistente** — `requireInteraction` + vibração quando chega chamada.
- **Overlay de chamada full-screen** que aparece por cima de tudo.
- **PWA instalável** — ícone na tela inicial, funciona offline (cache do Service Worker).
- **Histórico** de chamadas e cadastro de moradores/endereço (localStorage).
- **Layout responsivo** — mobile, tablet e desktop; overlay de rotação em paisagem mobile.

## Arquivos

| Arquivo | Função |
| --- | --- |
| `eu.html` | Página do **morador** (atende as chamadas). Fica aberto/instalado no celular do morador. |
| `index.html` | Página do **visitante** (faz a chamada). É o link do QR colado na porta. |
| `sw.js` | Service worker — push em background, notificações, cache offline (v3, com handler `activate` que limpa cache velho). |
| `manifest.json` | Manifesto PWA (instalar como app). |
| `icon-192.png` `icon-512.png` | Ícone do app (gradiente teal + sino branco). |
| `icon-maskable-192.png` `icon-maskable-512.png` | Ícone maskable (adapta a qualquer formato de máscara Android). |
| `apple-touch-icon.png` | Ícone para iOS (tela inicial). |
| `favicon.svg` | Favicon vetorial. |
| `functions/index.js` | **Cloud Function** `notificarChamada` — dispara push quando o visitante chama (app do morador fechado). |
| `functions/package.json` | Dependências da Cloud Function (firebase-admin, firebase-functions, Node 18). |
| `firebase.json` | Configuração de deploy (hosting + functions + database rules). |
| `database.rules.json` | Regras do Realtime Database (`chamada`, `moradorToken`, `historico`). |

## Deploy (obrigatório: HTTPS)

WebRTC, Service Worker e Wake Lock só funcionam em **HTTPS** (ou `localhost`).

### Firebase Hosting + Cloud Functions (recomendado)

O app usa uma **Cloud Function** que dispara o push quando o visitante chama —
é ela que permite ao morador receber a chamada **com o app fechado**.

**1. Configure a VAPID key (Web Push)**

No [Firebase Console](https://console.firebase.google.com) → seu projeto →
**Project Settings → Cloud Messaging → Web Push certificates → Generate**.
Copie a chave gerada e cole em `eu.html` (linha da constante `VAPID`):

```js
const VAPID='COLE_AQUI_SUA_VAPID_KEY';  // ← troque pela sua
```

**2. Faça o deploy**

```bash
npm install -g firebase-tools
firebase login
cd download
firebase deploy              # faz hosting + functions + database rules de uma vez
```

Na primeira vez, se o Firebase pedir pra associar o projeto:
```bash
firebase use --add doorvi-video
firebase deploy
```

> A Cloud Function roda em Node 18 (plano Blaze — necessário para funções que
> chamam APIs externas como o FCM). O Firebase Functions tem um nível gratuito
> generoso; um interfone residencial dificilmente ultrapassa.

### Alternativa rápida — só hosting (sem push em background)

Se não quiser deployar a Cloud Function agora, o app funciona normalmente com o
morador **com a aba aberta** (o listener em tempo real dispara). Arraste a pasta
`download/` para o Netlify, ou suba para o Vercel/GitHub Pages. O push com app
fechado só fica disponível após o passo da Cloud Function acima.

### Servidor local para teste

```bash
cd /home/z/my-project/download
python3 -m http.server 8080
# para acessar do celular, exponha via túnel HTTPS:
npx ngrok http 8080
```

> `file://` não funciona — precisa ser servido via HTTP/HTTPS.

## Como funciona o push (app fechado)

```
Visitante toca "Chamar"
        │
        ▼
  escreve em /chamada (Firebase RTDB)
        │
        ▼
  Cloud Function notificarChamada dispara
  (lê /moradorToken → envia push via FCM)
        │
        ▼
  Service Worker do morador recebe o push
  → mostra notificação "🔔 PortaLink — Visitante chamando"
        │
        ▼
  Morador toca na notificação → abre eu.html → atende
```

Sem a Cloud Function, o morador só recebe a chamada com a aba aberta
(listener em tempo real). Com ela, recebe **mesmo com o app fechado**
(no Android e desktop; no iPhone é preciso instalar na tela inicial).

## Como usar (morador)

1. Abra `https://SEU-DOMINIO/eu.html` no celular do morador.
2. Toque em **🧪 TESTAR SE TOCA** uma vez para liberar o áudio (iOS exige um gesto na primeira vez — depois o app auto-ativa).
3. Aceite o pedido de **notificação** — isso registra o token FCM (necessário pro push com app fechado).
4. Instale como app (**INSTALAR AGORA**) — no iPhone é obrigatório pra receber push em background.
5. Configure endereço e moradores nos botões da grade.
6. Pronto: pode fechar o app. Quando alguém chamar, a notificação toca sozinha.

## Como usar (visitante)

1. Escaneia o QR colado na porta → abre `https://SEU-DOMINIO/`.
2. Digita o nome e toca em **CHAMAR MORADOR**.
3. Libera câmera + microfone e aguarda o morador atender.

## Compatibilidade

| Plataforma | Vídeo (WebRTC) | Push (app fechado) | Instalar como app |
| --- | --- | --- | --- |
| **Android** | ✅ | ✅ melhor caso | ✅ Chrome |
| **Desktop / notebook** | ✅ | ✅ Chrome/Edge/Firefox | ✅ |
| **iPhone / iPad (iOS 16.4+)** | ✅ | ⚠️ só se instalar na tela inicial | ✅ Safari |

## Configurações preservadas (não alteradas)

- Firebase config (apiKey, databaseURL, projectId, etc.)
- Lógica WebRTC (offer/answer/ICE nos mesmos caminhos do RTDB)
- Chaves do localStorage: `portalink_moradores`, `portalink_endereco`, `portalink_bairro`, `portalink_historico`
- Caminhos no banco: `chamada`, `chamada/status`, `chamada/offer`, `chamada/answer`, `chamada/candidateMorador`, `chamada/candidateVisitante`, `moradorToken`
- Manifest (`start_url: /eu.html`, ícones, cores)
- QR apontando para `location.origin+"/"` (página do visitante)

## Observações técnicas

- **iOS Safari**: o áudio só é liberado após um gesto do usuário. Por isso o botão **TESTAR SE TOCA** deve ser tocado uma vez na primeira abertura. Depois o `liberarSom()` tenta auto-ativar. O `<audio id="alarme">` (mp3) fica reservado só pra esse desbloqueio — o som da campainha em si é o sino sintetizado.
- **Campainha**: gerada por `bellTone()` (5 parciais inarmônicas com envelope de sino) → `playDingDong()` (Sol5 + Dó5). Pico de amplitude ~0,55 (sem clipping). Repete a cada 2,6 s.
- **Service Worker v3**: com handler `activate` que apaga caches antigos, garantindo que o celular pegue a versão nova do `eu.html` após cada deploy.
- Para maximizar a chance de toque com a tela apagada, **instale como PWA** e deixe o app aberto em standalone.

---

© 2026 · **Elias Costa Negret's** — Todos os direitos reservados.
