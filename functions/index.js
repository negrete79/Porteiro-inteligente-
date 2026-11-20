/* ============================================================
   PortaLink — Cloud Function
   Vigia o nó /chamada no Realtime Database.
   Quando o visitante toca "Chamar" (status vira 'chamando'),
   lê o token FCM do morador e dispara um push.
   O Service Worker (sw.js) recebe e mostra a notificação
   "Visitante chamando" — mesmo com o app do morador fechado.

   Deploy:  cd download && firebase deploy --only functions
============================================================ */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.notificarChamada = functions.database
  .ref('/chamada')
  .onWrite(async (change, context) => {
    const before = change.before.val();
    const after = change.after.val();

    // Só dispara quando uma NOVA chamada entra (status vira 'chamando').
    // Ignora atualizações de status (atendido / encerrado) pra não notificar 2x.
    if (!after || after.status !== 'chamando') return null;
    if (before && before.status === 'chamando') return null;

    const nome = after.nome || 'Visitante';

    // Lê o token FCM salvo pelo app do morador (eu.html → salvarTokenFCM)
    const tokenSnap = await admin.database().ref('/moradorToken').get();
    const token = tokenSnap.val();
    if (!token) {
      console.log('[PortaLink] sem token do morador — o app ainda não registrou push.');
      return null;
    }

    // Mensagem data-only: o sw.js recebe via evento 'push' / onBackgroundMessage
    // e chama showNotification() com ícone, vibração e requireInteraction.
    const message = {
      data: {
        title: '🔔 PortaLink',
        body: nome + ' está chamando no interfone',
        url: '/eu.html'
      },
      android: { priority: 'high' },
      webpush: {
        headers: { TTL: '300' },
        fcmOptions: { link: '/eu.html' }
      },
      token: token
    };

    try {
      await admin.messaging().send(message);
      console.log('[PortaLink] push enviado: ' + nome + ' chamando');
    } catch (error) {
      console.error('[PortaLink] erro ao enviar push:', error);
    }
    return null;
  });
