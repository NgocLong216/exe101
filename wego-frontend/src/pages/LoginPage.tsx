import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import { useState } from "react";
import { requestFcmToken } from "../firebase-messaging";

export default function LoginPage({ setUser }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const loginWithFacebook = async () => {
    try {
      const auth = getAuth();
      const provider = new FacebookAuthProvider();

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const firebaseIdToken = await firebaseUser.getIdToken();

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/firebase`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: firebaseIdToken,
          }),
        }
      );

      const data = await res.json();

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);

      navigate("/home");

    } catch (err) {
      console.error(err);
      setError("Đăng nhập Facebook thất bại");
    }
  };

  const loginWithGoogle = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // 🔥 FIREBASE ID TOKEN
      const firebaseIdToken = await firebaseUser.getIdToken();

      // 🔥 LOGIN BACKEND
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/firebase`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: firebaseIdToken,
          }),
        }
      );

      if (!res.ok) throw new Error("Backend login failed");

      const data = await res.json();
      console.log("Backend response:", data);


      // Lưu JWT
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);

      // =========================
      // 🔥 LẤY FCM TOKEN
      // =========================

      const fcmToken = await requestFcmToken();

      if (fcmToken) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/users/save-fcm-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firebaseIdToken}`, // 🔥 dùng firebase token
          },
          body: JSON.stringify({
            fcmToken: fcmToken,
          }),
        });
      }

      navigate("/home");
    } catch (err) {
      console.error(err);
      setError("Đăng nhập Google thất bại");
    }
  };

  return (
    <main className="flex justify-center items-center min-h-screen bg-[#fff8f2]">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-[400px] text-center">
        <h1 className="text-3xl font-bold mb-6">Đăng nhập</h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 h-12 border-2 border-gray-300 rounded-lg text-lg font-medium hover:bg-gray-100 transition"
        >
          <FaGoogle className="text-red-500" />
          Đăng nhập bằng Google
        </button>
        <button
          onClick={loginWithFacebook}
          className="w-full flex items-center justify-center gap-3 h-12 border-2 border-gray-300 rounded-lg text-lg font-medium hover:bg-gray-100 transition mt-4"
        >
          <FaFacebook className="text-blue-600" />
          Đăng nhập bằng Facebook
        </button>
      </div>
    </main>
  );
}
