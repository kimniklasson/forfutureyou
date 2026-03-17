import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconLogout, IconTrash } from "../components/ui/icons";
import { useAuth } from "../auth/useAuth";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useSettingsStore, type Appearance } from "../stores/useSettingsStore";

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
  const { appearance, setAppearance } = useSettingsStore();

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

  const appearanceOptions: { value: Appearance; label: string }[] = [
    { value: "ljus", label: "Ljus" },
    { value: "mörkt", label: "Mörkt" },
    { value: "auto", label: "Auto" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Title row */}
      <div className="flex flex-col items-center text-center">
        <span className="text-[20px] font-bold leading-[1.22]">Kontoöversikt</span>
        <span className="text-[20px] leading-[1.22] opacity-50">{providerLabel}</span>
      </div>

      <div className="flex flex-col gap-6">
        {/* Name field */}
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
            Ditt namn
          </span>
          <div className={`border rounded-card flex items-center gap-2 pl-6 pr-4 py-4 ${nameError ? "border-red-300" : "border-black/10 dark:border-white/20"}`}>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              maxLength={60}
              placeholder="Ditt namn"
              className="flex-1 text-[15px] bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={handleNameSave}
              disabled={!hasChanged || saving}
              className={`px-3 py-2 rounded-button text-[12px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center ${
                hasChanged && !saving
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "bg-black/5 dark:bg-white/10 text-black/30 dark:text-white/30"
              }`}
            >
              {saving
                ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : "Spara"
              }
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
          <div className="border border-black/10 dark:border-white/20 rounded-card pl-6 pr-4 py-4 opacity-50">
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full bg-transparent text-[15px] outline-none cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Settings section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-bold leading-[18px]">Inställningar</span>
          <span className="text-[15px] leading-[18px] opacity-50">Så som du vill ha det</span>
        </div>

        <div className="flex flex-col gap-2">
          {/* Appearance row */}
          <div className="border border-black/10 dark:border-white/20 rounded-card flex items-center pl-6 pr-4 py-4">
            <span className="flex-1 text-[15px]">Utseende</span>
            <div className="flex gap-1">
              {appearanceOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAppearance(value)}
                  className={`px-3 py-2 rounded-button text-[12px] font-bold uppercase tracking-wider transition-colors ${
                    appearance === value
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "bg-black/5 dark:bg-white/10 text-black/40 dark:text-white/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
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

      {/* Logout */}
      <button
        type="button"
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 rounded-card px-6 py-5 text-[13px] font-bold uppercase tracking-wider text-white transition-colors"
      >
        Logga ut
        <IconLogout size={18} />
      </button>

      {/* Delete account */}
      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        disabled={deleting}
        className="w-full flex items-center justify-center gap-3 bg-black/5 dark:bg-white/10 rounded-card px-6 py-5 text-[13px] font-bold uppercase tracking-wider text-red-500 hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
      >
        {deleting ? "Tar bort..." : "Ta bort konto"}
        <IconTrash size={18} />
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
        confirmLabel="Ta bort"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
