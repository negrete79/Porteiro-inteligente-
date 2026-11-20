// PortaLink - Config única do Firebase
// USADO POR: admin.html + eu.html
// Projeto: doorvi-video
// NÃO crie outro firebase.js, NÃO copie config diferente nos HTML.
// Se trocar de projeto, troca SÓ aqui.

const PORTALINK_FIREBASE_CONFIG = {
  apiKey: "COLE_AQUI_SUA_APIKEY_DO_CONSOLE",
  authDomain: "doorvi-video.firebaseapp.com",
  databaseURL: "https://doorvi-video-default-rtdb.firebaseio.com",
  projectId: "doorvi-video",
  storageBucket: "doorvi-video.firebasestorage.app",
  messagingSenderId: "869461304542",
  appId: "1:869461304542:web:35fffbe8fb1b2a00a38e4f"
};

// Expõe pra os 2 HTMLs usarem
window.PORTALINK_FIREBASE_CONFIG = PORTALINK_FIREBASE_CONFIG;

// Inicializa o App 1 vez só
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(PORTALINK_FIREBASE_CONFIG);
}

// RTDB - só para a chamada de vídeo (WebRTC)
let dbRT = null;
try {
  if (typeof firebase !== 'undefined' && firebase.database) {
    dbRT = firebase.database();
  }
} catch (e) {
  console.log('[PORTALINK] RTDB indisponível', e);
}
window.dbRT = dbRT;

// Firestore - casas, assinaturas, pagamentos
// O admin e o eu.html usam: firebase.firestore().collection('casas')
console.log('[PORTALINK] firebase.js carregado:', PORTALINK_FIREBASE_CONFIG.projectId);
