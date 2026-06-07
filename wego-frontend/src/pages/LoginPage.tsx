import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FaGoogle } from "react-icons/fa";
import { useState } from "react";
import { requestFcmToken } from "../firebase-messaging";

export default function LoginPage({ setUser }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const loginWithGoogle = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const firebaseIdToken = await firebaseUser.getIdToken();

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/firebase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: firebaseIdToken }),
      });
      if (!res.ok) throw new Error("Backend login failed");
      const data = await res.json();

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);

      const fcmToken = await requestFcmToken();
      if (fcmToken) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/users/save-fcm-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firebaseIdToken}`,
          },
          body: JSON.stringify({ fcmToken }),
        });
      }

      if (data.role?.name === "ADMIN") navigate("/admin");
      else navigate("/home");
    } catch (err) {
      console.error(err);
      setError("Đăng nhập Google thất bại");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Email/password login logic here
  };

  return (
    <main
      className="flex flex-col justify-center items-center min-h-screen"
      style={{ background: "linear-gradient(135deg, #dce8f7 0%, #e8eef8 50%, #d6e4f5 100%)" }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#1a2b6b] flex items-center justify-center shadow-md">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" />
              <path d="M7 10l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-[#1a2b6b] tracking-tight">AdminPanel</span>
        </div>
        <p className="text-sm text-slate-500 tracking-wide">Management Console Access</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 w-[400px]">
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center bg-red-50 rounded-lg py-2 px-3">{error}</p>
        )}

        {/* Google button */}
        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 h-12 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm mb-5"
        >
          <div className="w-5 h-5 rounded-sm bg-slate-800 flex items-center justify-center">
            <FaGoogle className="text-white text-[10px]" />
          </div>
          Sign in with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="4" width="20" height="16" rx="3" />
                  <path d="M2 8l10 6 10-6" />
                </svg>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1a2b6b]/20 focus:border-[#1a2b6b]/40 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-600">Password</label>
              <button
                type="button"
                className="text-xs font-semibold text-[#1a2b6b] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 018 0v4" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1a2b6b]/20 focus:border-[#1a2b6b]/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-[#1a2b6b] cursor-pointer"
            />
            <span className="text-xs text-slate-500">Stay signed in for 30 days</span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            className="w-full h-12 bg-[#1a2b6b] text-white rounded-xl text-sm font-bold tracking-wide hover:bg-[#152257] transition-colors shadow-md mt-1"
          >
            Sign In
          </button>
        </form>
      </div>

      {/* Sign up */}
      <p className="text-sm text-slate-500 mt-6">
        Don't have an account?{" "}
        <button className="font-bold text-[#1a2b6b] hover:underline">Sign up</button>
      </p>

      {/* Footer */}
      <div className="flex gap-5 mt-8">
        <button className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Privacy Policy</button>
        <button className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Terms of Service</button>
      </div>
    </main>
  );
}