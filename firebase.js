// firebase.js — ÚNICA configuração Firebase do PortaLink.
// Compartilhada por admin.html e eu.html. Mesmo projectId, mesma coleção "casas".
// Carregue DEPOIS dos SDKs firebase-*-compat.js.
const firebaseConfig = {
  apiKey: "AIzaSyBWNX3xRTBEybD0FmW85c1eL_3mSZujMlY",
  authDomain: "doorvi-video.firebaseapp.com",
  databaseURL: "https://doorvi-video-default-rtdb.firebaseio.com",
  projectId: "doorvi-video",
  storageBucket: "doorvi-video.firebasestorage.app",
  messagingSenderId: "869461304542",
  appId: "1:869461304542:web:35fffbe8fb1b2a00a38e4f"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
window.fbConfig = firebaseConfig;
window.fbProjectId = firebaseConfig.projectId;
window.dbStore = firebase.firestore();   // Firestore — coleção "casas" (admin + eu.html)
window.dbRT = firebase.database();        // RTDB — só sinalização WebRTC (db.ref('chamada'))
console.log("conectado firebase:", firebaseConfig.projectId);
