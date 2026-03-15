import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Trash2 } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

const NAME_REGEX = /^[a-zA-ZåäöÅÄÖéèêëàâùûüïîçæœÉÈÊËÀÂÙÛÜÏÎÇÆŒ\s]+$/;

function getProviderLabel(user: ReturnType<typeof useAuth>["user"]): string {
  const provider = user?.app_metadata?.provider;
  if (provider === "google") return "Inloggad via Google";
  if (provider === "github") return "Inloggad via GitHub";
  return "Inloggad via e-post";
}

export function ProfilePage() {
  const { user, displayName, updateName, signOut, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(displayName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasChanged = name.trim() !== displayName && name.trim().length > 0;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || NAME_REGEX.test(value)) {
      setName(value);
      setNameError(null);
    }
  };

  const handleNameSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || !hasChanged) return;
    setSaving(true);
    const { error } = await updateName(trimmed);
    setSaving(false);
    if (error) setNameError(error);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleNameSave();
  };

  const handleConfirmSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    const { error } = await deleteAccount();
    setDeleting(false);
    if (!error) {
      navigate("/login", { replace: true });
    }
  };

  const providerLabel = getProviderLabel(user);

  return (
    <div className="flex flex-col gap-8">
      {/* Title row */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-[15px] font-bold leading-[18px]">Kontooversikt</span>
          <span className="text-[15px] leading-[18px] opacity-50">{providerLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 hover:bg-red-600 transition-colors"
          aria-label="Logga ut"
        >
          <LogOut size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Name field */}
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
            Ditt namn
          </span>
          <div className={`border rounded-card flex items-center gap-2 pl-6 pr-4 py-4 ${nameError ? "border-red-300" : "border-black/10"}`}>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              maxLength={60}
              placeholder="Ditt namn"
              className="flex-1 text-[15px] bg-transparent outline-none placeholder:opacity-30"
            />
            <button
              type="button"
              onClick={handleNameSave}
              disabled={!hasChanged || saving}
              className={`px-3 py-2 rounded-button text-[12px] font-bold uppercase tracking-wider transition-colors ${
                hasChanged && !saving
                  ? "bg-black text-white"
                  : "bg-black/5 text-black/30"
              }`}
            >
              {saving ? "..." : "Spara"}
            </button>
          </div>
          {nameError && (
            <span className="text-[12px] text-red-500">{nameError}</span>
          )}
        </div>

        {/* Email field */}
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
            Din e-postadress
          </span>
          <div className="border border-black/10 rounded-card pl-6 pr-4 py-4 opacity-50">
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full bg-transparent text-[15px] outline-none cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* About section */}
      <div className="flex flex-col gap-1 pt-2">
        <span className="text-[15px] font-bold leading-[18px]">Om appen (version 1.0)</span>
        <span className="text-[15px] leading-[18px] opacity-50">
          Den här appen är designad av Kim Niklasson och framtagen med hjälp av AI.
        </span>
      </div>

      {/* Delete account */}
      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        disabled={deleting}
        className="flex items-center gap-2 text-[13px] text-red-500 opacity-70 hover:opacity-100 transition-opacity pt-4 self-start"
      >
        <Trash2 size={14} />
        {deleting ? "Tar bort..." : "Ta bort mitt konto"}
      </button>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        message="Är du säker på att du vill logga ut?"
        confirmLabel="Logga ut"
        onConfirm={handleConfirmSignOut}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        message="Är du säker på att du vill ta bort ditt konto? All din data kommer att raderas permanent."
        confirmLabel="Ta bort konto"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
