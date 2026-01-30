import { FaGoogle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useState } from "react";

export default function LoginPage({ setUser }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch(`${API_URL}/api/auth/google`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: tokenResponse.access_token,
          }),
        });

        if (!res.ok) throw new Error("Đăng nhập Google thất bại");

        const data = await res.json();

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);

        navigate("/home");
      } catch (err) {
        setError(err.message);
      }
    },
    onError: () => {
      setError("Đăng nhập Google thất bại");
    },
  });

  return (
    <main className="flex justify-center items-center min-h-screen bg-[#fff8f2]">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-[400px] text-center">
        <h1 className="text-3xl font-bold mb-6">Đăng nhập</h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          onClick={() => loginWithGoogle()}
          className="w-full flex items-center justify-center gap-3 h-12 border-2 border-gray-300 rounded-lg text-lg font-medium hover:bg-gray-100 transition"
        >
          <FaGoogle className="text-red-500" />
          Đăng nhập bằng Google
        </button>
      </div>
    </main>
  );
}
