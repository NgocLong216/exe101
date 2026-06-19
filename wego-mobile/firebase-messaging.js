import { getMessaging, getToken, onMessage } from "firebase/messaging";
import toast from "react-hot-toast";
import { app } from "../firebase";

const messaging = getMessaging(app);

/**
 * Xin quyền và lấy FCM token
 */
export const requestFcmToken = async () => {
  try {
    if (Notification.permission === "denied") {
      return null;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return null;
    }

    // ✅ Đăng ký service worker
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    // ✅ Lấy token
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token;
  } catch (error) {
    console.error("FCM token error:", error);
    return null;
  }
};

/**
 * Lắng nghe push khi tab đang mở (foreground)
 */
export const listenForegroundMessage = () => {
  onMessage(messaging, (payload) => {
    if (payload.notification) {
      toast.success(
        `${payload.notification.title}\n${payload.notification.body}`
      );
    }
  });
};