import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase JS automatically processes hash tokens or PKCE code on init.
    // onAuthStateChange in AuthProvider will set the user state.
    // We just need to redirect to the right place once the session is ready.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate("/", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-secondary text-sm">Verifying your account…</p>
    </div>
  );
}
