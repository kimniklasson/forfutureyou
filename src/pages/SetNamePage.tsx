import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const NAME_REGEX = /^[a-zA-ZåäöÅÄÖéèêëàâùûüïîçæœÉÈÊËÀÂÙÛÜÏÎÇÆŒ\s]+$/;

export function SetNamePage() {
  const { user, loading, displayName, updateName } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto max-w-[600px] min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (displayName) return <Navigate to="/" replace />;

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || NAME_REGEX.test(value)) {
      setName(value);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const { error } = await updateName(trimmed);
    if (error) {
      setError(error);
      setSubmitting(false);
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="mx-auto max-w-[600px] min-h-screen bg-white flex flex-col items-center justify-center px-8">
      {/* Logo */}
      <svg
        width="48"
        height="16"
        viewBox="0 0 48 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-12"
      >
        <path
          d="M6 0V16H4V0H6ZM10 0V7H38V0H40V16H38V9H10V16H8V0H10ZM44 0V16H42V0H44ZM2 4V12H0V4H2ZM48 4V12H46V4H48Z"
          fill="black"
        />
      </svg>

      <h1 className="text-[20px] font-bold mb-2">Vad heter du?</h1>
      <p className="text-[15px] text-black/50 mb-8 text-center">
        Ange ditt namn för att komma igång.
      </p>

      {error && (
        <div className="w-full max-w-[345px] mb-4 p-3 bg-red-50 border border-red-200 rounded-button text-[13px] text-red-700 text-center">
          {error}
        </div>
      )}

      <div className="w-full max-w-[345px]">
        <div className={`border rounded-card flex items-center gap-2 pl-6 pr-4 py-4 transition-colors ${focused ? "border-black" : "border-black/10"}`}>
          <input
            type="text"
            placeholder="Fyll i ditt namn"
            value={name}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={60}
            autoFocus
            className="flex-1 text-[15px] text-black bg-transparent outline-none placeholder:text-black/50"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`px-3 py-2 rounded-button text-[12px] font-bold uppercase tracking-wider transition-colors ${
              canSubmit
                ? "bg-black text-white"
                : "bg-black/5 text-black/30"
            }`}
          >
            {submitting ? "..." : "Fortsätt"}
          </button>
        </div>
      </div>
    </div>
  );
}
