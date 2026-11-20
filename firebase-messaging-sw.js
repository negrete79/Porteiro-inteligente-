importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBWNX3xRTBEybD0FmW85c1eL_3mSZujMlY",
  authDomain: "doorvi-video.firebaseapp.com",
  databaseURL: "https://doorvi-video-default-rtdb.firebaseio.com",
  projectId: "doorvi-video",
  storageBucket: "doorvi-video.firebasestorage.app",
  messagingSenderId: "869461304542",
  appId: "1:869461304542:web:35fffbe8fb1b2a00a38e4f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/1946/1946436.png',
    vibrate: [600,200,600,200,600,200,1000],
    tag: 'porteiro',
    renotify: true,
    requireInteraction: true
  });
});
