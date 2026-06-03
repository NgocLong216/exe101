importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCY95z91jd_OLCc9K-2wdRr2mHxqlunxZ8",
  authDomain: "crested-drive-483712-e5.firebaseapp.com",
  databaseURL: "https://crested-drive-483712-e5-default-rtdb.firebaseio.com",
  projectId: "crested-drive-483712-e5",
  storageBucket: "crested-drive-483712-e5.firebasestorage.app",
  messagingSenderId: "604419916756",
  appId: "1:604419916756:web:e2fa42c0743e206da70c41",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("🔥 Background message received:", payload);

  self.registration.showNotification("TEST NOTI", {
    body: "Nếu thấy cái này thì SW hoạt động",
    icon: "/vite.svg",
  });
});