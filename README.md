# PortaLink — Interfone de Vídeo (SaaS multi-cliente)

PWA de interfone com vídeo via WebRTC + Firebase Realtime Database, agora em modelo **SaaS**: você cadastra vários clientes no painel admin, cada cliente tem sua **casa** isolada (campainha + celular do morador), cobra mensalidade ou vitalício via PIX, e controla quem pode usar o app.

Painel e app compartilham **o mesmo Realtime Database** — por isso o painel vê o app e o app vê o painel (foi o erro das versões anteriores: bancos separados não se enxergavam).

## Como funciona

- **Painel admin** (`admin.html`): você cria o cliente → gera um link `eu.html?casa=ID` → envia pro cliente.
- **App do morador** (`eu.html?casa=ID`): o cliente abre no celular. Registra o aparelho (deviceId), lê o status de ativação e os valores direto do RTDB. Se estiver bloqueado (não pagou), mostra o overlay "Pague para continuar" com PIX + WhatsApp.
- **Campainha** (`index.html?casa=ID`): o tablet/portão do cliente. Visitante toca → escreve em `casas/{casaId}/chamada` → o celular do morador daquela casa toca (sinalização isolada por casa, então clientes não se misturam).
- **Cloud Function**: vigia `casas/{casaId}/chamada` e manda push pro morador daquela casa, mesmo com o app fechado.

## Arquivos

| Arquivo | Função |
| --- | --- |
| `admin.html` | **Painel admin** (login + clientes + valores + chamadas). Só você acessa. |
| `eu.html` | App do **morador** (atende chamadas + overlay de ativação). Instala no celular do cliente. |
| `index.html` | **Campainha/visitante** (faz a chamada). Fica no tablet/portão do cliente. |
| `functions/index.js` | Cloud Function `notificarChamada` (push por casa). |
| `database.rules.json` | Regras do Realtime Database. |
| `firebase.json` | Firebase Hosting + Functions + Database. |
| `sw.js`, `manifest.json`, ícones, `dingdong_demo.wav` | PWA (instalação, push, cache). |

## Estrutura do Realtime Database

```
casas/
  {casaId}/
    nome, whatsapp, plano (mensal|vitalicio), valor, status (trial|ativo|bloqueado), vencimento, criadoEm
    chamada/          → sinalização WebRTC (status, nome, offer, answer, candidates)
    moradorToken      → token FCM do morador (pra push)
    dispositivos/
      {deviceId}/     → modelo, ultimoAcesso, appVersion  (o painel vê cada aparelho instalado)
config/
  valores/            → mensalidade, vitalicio, trialDias, pixKey, whatsapp  (editável no painel, reflete no app)
pagamentos/
  {pagId}/            → casaId, valor, status, data  (registrado ao marcar "pago")
```

Tudo no **mesmo** RTDB (`doorvi-video-default-rtdb`). Painel e app leem/escrevem aqui → conexão garantida.

## Deploy (Firebase Hosting)

O app roda em **Firebase Hosting** (não Vercel). Um comando sobe tudo:

```bash
npm install -g firebase-tools        # se não tiver
firebase login                        # uma vez
firebase deploy                       # sobe admin.html, eu.html, index.html + a Cloud Function + as regras
```

Depois de publicar as regras (`database.rules.json`) no console Firebase → Realtime Database → Regras.

## Como adicionar um cliente (passo a passo)

1. Abra o `admin.html` → digite a senha (`portalink2026` — troque no código).
2. Aba **Clientes** → **Novo cliente** → preencha nome, WhatsApp, plano (mensal/vitalício) → **Criar**.
3. O painel gera a casa no Firebase e abre os links:
   - **App do morador**: `https://SEU_HOST/eu.html?casa=casa-xxxx` → manda pro cliente abrir no celular.
   - **Campainha**: `https://SEU_HOST/index.html?casa=casa-xxxx` → fica no tablet/portão do cliente.
4. O cliente abre o app → o aparelho aparece em **Dispositivos** no painel → o status começa em **trial** (7 dias).
5. Quando o trial vence (ou quando você clica **Bloquear**), o app do cliente mostra o overlay "Pague para continuar" com o PIX.

## Cobrança (PIX manual)

1. Aba **Valores & PIX** → defina **mensalidade**, **vitalício**, **chave PIX** e **WhatsApp** → **Salvar**. (Muda no app na hora.)
2. Quando um cliente vai pagar: aba **Clientes** → **PIX** na linha dele → copia a chave + valor → manda no WhatsApp dele.
3. Quando o PIX cair: **Pago** na linha → status vira **ativo** + vencimento +30 dias → o app do cliente desbloqueia na hora.
4. Se o PIX/token falhar: **Ativar** libera o cliente manualmente (ativa +30 dias ou vitalício).

## O que o painel vê (tudo em tempo real)

- **Clientes**: nome, plano, valor, status (trial/ativo/bloqueado), vencimento.
- **Dispositivos**: cada aparelho que abriu o app (id, modelo Android/iOS, último acesso, online/offline).
- **Chamadas**: quando alguém toca a campainha de qualquer casa, aparece aqui na hora (status "chamando agora").
- **Resumo**: total de clientes, ativos, bloqueados, dispositivos, MRR (receita mensal recorrente).

## Senha do admin

O painel é uma página estática (Firebase Hosting, sem backend), então a senha é conferida no navegador. Troque em `admin.html`:

```js
const ADMIN_PWD='portalink2026';   // ← mude aqui
```

A segurança real do banco são as regras `database.rules.json`. Hoje estão **abertas** (`read/write: true`) pra tudo funcionar sem setup. Pra travar depois: use Firebase Auth (login real) e restrinja as regras por usuário.

## Notas

- Cada casa é isolada pelo `casaId` na URL (`?casa=ID`). A campainha e o app do morador precisam usar o **mesmo** `casaId` pra se falarem.
- Se o cliente abrir o `eu.html` sem `?casa=`, cai numa casa padrão (`casa-padrao`) — útil só pra teste.
- O push exige a **VAPID key** (Firebase Console → Project Settings → Cloud Messaging → Web Push → Generate). Troque a constante `VAPID` no `eu.html`.
