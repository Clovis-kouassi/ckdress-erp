importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyAUnyWMGA7HJsorTDT06aUDK6McXrSFC9E",
  authDomain: "ckdress-erp.firebaseapp.com",
  projectId: "ckdress-erp",
  storageBucket: "ckdress-erp.firebasestorage.app",
  messagingSenderId: "1063926152452",
  appId: "1:1063926152452:web:68d11e093bca99d744e451"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
  })
})