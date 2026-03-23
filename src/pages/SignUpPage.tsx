import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Header } from "../components/layout/Header";
import { ScrollingGallery } from "../components/ui/ScrollingGallery";

export function SignUpPage() {
  const { user, loading, signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
    const { error } = await signUp(email, password);
    if (error) {
      setError(error);
    } else {
      setSuccess(true);
    }
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(error);
  };

  if (success) {
    return (
      <div className="mx-auto max-w-[600px] min-h-screen bg-white dark:bg-[#111111] flex flex-col items-center justify-center px-8">
        <Header />
        <div className="w-full max-w-[345px] text-center">
          <div className="w-14 h-14 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-[20px] font-bold mb-3">Kolla din e-post</h1>
          <p className="text-[15px] text-black/50 dark:text-white/50 mb-8">
            Vi har skickat en bekräftelselänk till <strong className="text-black dark:text-white">{email}</strong>. Klicka på länken för att aktivera ditt konto.
          </p>
          <Link
            to="/login"
            className="inline-block py-4 px-[34px] bg-black dark:bg-white text-white dark:text-black text-[12px] font-bold uppercase tracking-wider rounded-button"
          >
            Tillbaka till inloggning
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[600px] min-h-screen bg-white dark:bg-[#111111] flex flex-col">
      <Header />

      {/* Centered form area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
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
              placeholder="Lösenord (minst 8 tecken)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-[15px] outline-none"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black text-[12px] font-bold uppercase tracking-wider rounded-button disabled:opacity-50"
          >
            {submitting ? "Skapar konto..." : "Skapa konto"}
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
          Redan har ett konto?{" "}
          <Link to="/login" className="text-black dark:text-white font-bold underline">
            Logga in
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
