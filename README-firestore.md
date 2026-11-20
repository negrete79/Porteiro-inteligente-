# PortaLink — Conexão Firestore (admin ↔ eu.html)

## O que mudou
Tudo agora usa **Firestore** (coleção `casas`), no MESMO projeto Firebase (`doorvi-video`).
Admin e eu.html compartilham **um único `firebase.js`** e leem/escrevem a MESMA coleção em tempo real.

## Arquivos entregues
- `firebase.js` — ÚNICA config Firebase (projectId `doorvi-video`). Carregada por admin.html e eu.html.
- `eu.html` — cria/lê a casa via Firestore client + `onSnapshot` (admin renomeia → reflete na hora).
- `admin.html` — lista casas via Firestore `onSnapshot` (casa nova do eu.html aparece sozinha).
- `api/*.js` + `lib/firebase.js` — backend migrado pra Firestore Admin SDK (`getFs()`).
- `firestore.rules` — regras de TESTE (`allow read, write: if true`).
- `firestore.rules.prod` — regras de PRODUÇÃO (use depois de testar).

## Config Firebase usada (mesma nos 2 arquivos)
```
projectId:       doorvi-video
databaseURL:     https://doorvi-video-default-rtdb.firebaseio.com   (RTDB — só chamada WebRTC)
authDomain:      doorvi-video.firebaseapp.com
storageBucket:   doorvi-video.firebasestorage.app
messagingSenderId: 869461304542
appId:           1:869461304542:web:35fffbe8fb1b2a00a38e4f
```

## Campos da coleção "casas" (padrão em tudo)
`casaId`, `nome`, `status` (trial|ativo|bloqueado), `trialFim`, `ativoAte`, `criadoEm`, `plano`

## Como ativar (3 passos no console Firebase)

### 1. Criar o banco Firestore
Firebase Console → projeto `doorvi-video` → **Firestore Database** → "Criar banco"
→ modo de produção → região (us-central1 ok).

### 2. Colar as regras de teste
Firestore Database → aba **Regras** → cole o conteúdo de `firestore.rules` → **Publicar**:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 3. (Vercel) Confirmar env vars do Admin SDK
No Vercel → Settings → Environment Variables, precisa ter:
`FB_CLIENT_EMAIL`, `FB_PRIVATE_KEY` (service account do `doorvi-video`).
(O Admin SDK ignora as regras do Firestore, então o webhook/PIX funcionam mesmo com regras restritas depois.)

## Como testar a conexão
1. Abra `https://SEU-APP.vercel.app/eu.html` (janela anônima) → F12 Console:
   vê `conectado firebase: doorvi-video casa-XXXXXX`.
2. Abra `https://SEU-APP.vercel.app/admin.html` → aba **Casas** → F12 Console:
   vê `casas encontradas: 1` (a casa que o eu.html acabou de criar aparece sozinha).
3. No admin, clique **✎ Renomear** → digite "Apto 101 - João".
4. No eu.html (outra aba) → o selo/banner atualiza sozinho (onSnapshot em tempo real).
5. Firebase Console → Firestore Database → coleção **casas** → vê o documento com nome novo.

## Logs de debug (F12)
- eu.html: `conectado firebase: doorvi-video <casaId>`
- admin.html: `casas encontradas: <n>`
