import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Header } from "../components/layout/Header";
import { ScrollingGallery } from "../components/ui/ScrollingGallery";

export function LoginPage() {
  const { user, loading, signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto max-w-[600px] min-h-screen bg-white dark:bg-[#111111] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(error);
  };

  return (
    <div className="mx-auto max-w-[600px] min-h-screen bg-white dark:bg-[#111111] flex flex-col">
      <Header />

      {/* Form area */}
      <div className="flex flex-col items-center px-8 pt-40 pb-40">
        <div className="w-full max-w-[345px] mb-8 text-center">
          <p className="text-[20px] font-bold">Välkommen till Allceps!</p>
          <p className="text-[20px]">Logga in eller skapa konto nedan</p>
        </div>

        {error && (
          <div className="w-full max-w-[345px] mb-4 p-3 bg-red-50 border border-red-200 rounded-button text-[13px] text-red-700 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full max-w-[345px] flex flex-col gap-4">
          <div className="bg-card rounded-card p-4 border border-transparent">
            <input
              type="email"
              placeholder="E-post"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-[15px] outline-none"
              required
            />
          </div>

          <div className="bg-card rounded-card p-4 border border-transparent">
            <input
              type="password"
              placeholder="Lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-[15px] outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black text-[12px] font-bold uppercase tracking-wider rounded-button disabled:opacity-50"
          >
            {submitting ? "Loggar in..." : "Logga in"}
          </button>
        </form>

        {/* TODO: Enable when Google sign-in is implemented */}
        {false && <div className="w-full max-w-[345px] flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
          <span className="text-[12px] text-black/40 dark:text-white/40 uppercase tracking-wider">eller</span>
          <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
        </div>}

        {false && <button
          onClick={handleGoogle}
          className="w-full max-w-[345px] py-4 bg-card text-[12px] font-bold uppercase tracking-wider rounded-button flex items-center justify-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
          </svg>
          Fortsätt med Google
        </button>}

        <p className="mt-8 text-[13px] text-black/50 dark:text-white/50">
          Inget konto?{" "}
          <Link to="/signup" className="text-black dark:text-white font-bold underline">
            Skapa konto
          </Link>
        </p>
      </div>

      {/* Scrolling gallery */}
      <div className="pb-8">
        <ScrollingGallery />
      </div>
    </div>
  );
}
