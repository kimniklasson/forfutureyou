import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BodyModelPreview } from "../components/body/BodyModelPreview";
import { IconLogout, IconTrash, IconArrowLeft } from "../components/ui/icons";
import { useAuth } from "../auth/useAuth";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Modal } from "../components/ui/Modal";
import { useSettingsStore, type Appearance, type Sex } from "../stores/useSettingsStore";
import { IconShow, IconHide } from "../components/ui/icons";

const NAME_REGEX = /^[a-zA-ZåäöÅÄÖéèêëàâùûüïîçæœÉÈÊËÀÂÙÛÜÏÎÇÆŒ\s]+$/;

function getProviderLabel(user: ReturnType<typeof useAuth>["user"]): string {
  const provider = user?.app_metadata?.provider;
  if (provider === "google") return "Inloggad via Google";
  if (provider === "github") return "Inloggad via GitHub";
  return "Inloggad via e-post";
}

export function ProfilePage() {
  const { user, displayName, updateName, updatePassword, signOut, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const { appearance, setAppearance, userWeight, setUserWeight, userAge, setUserAge, userSex, setUserSex, showCalories, setShowCalories } = useSettingsStore();

  const [name, setName] = useState(displayName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [weightInput, setWeightInput] = useState(userWeight > 0 ? String(userWeight) : "");
  const [savingWeight, setSavingWeight] = useState(false);
  const [ageInput, setAgeInput] = useState(userAge > 0 ? String(userAge) : "");
  const [savingAge, setSavingAge] = useState(false);

  const weightValue = parseFloat(weightInput) || 0;
  const weightChanged = weightValue !== userWeight;
  const ageValue = parseInt(ageInput) || 0;
  const ageChanged = ageValue !== userAge;
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handlePasswordSave = async () => {
    setPasswordError(null);
    if (newPassword.length < 6) { setPasswordError("Lösenordet måste vara minst 6 tecken."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Lösenorden matchar inte."); return; }
    setSavingPassword(true);
    const { error } = await updatePassword(currentPassword, newPassword);
    setSavingPassword(false);
    if (error) { setPasswordError(error); return; }
    setPasswordSuccess(true);
    setTimeout(() => {
      setShowPasswordModal(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordSuccess(false);
    }, 1500);
  };

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


  const handleWeightSave = () => {
    if (!weightChanged) return;
    setSavingWeight(true);
    setUserWeight(weightValue);
    setTimeout(() => setSavingWeight(false), 300);
  };

  const handleAgeSave = () => {
    if (!ageChanged) return;
    setSavingAge(true);
    setUserAge(ageValue);
    setTimeout(() => setSavingAge(false), 300);
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

  const sexOptions: { value: Sex; label: string }[] = [
    { value: "man", label: "Man" },
    { value: "kvinna", label: "Kvinna" },
  ];

  return (
    <div className="flex flex-col gap-10">
      {/* Title row */}
      <div className="flex flex-col items-center text-center">
        <span className="text-[20px] font-bold leading-[1.22]">Kontoöversikt</span>
        <span className="text-[20px] leading-[1.22] opacity-50">{providerLabel}</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">Om dig</span>

        {/* Name field */}
        <div className="flex flex-col gap-2">
          <label className={`border rounded-card flex items-center pl-6 pr-4 py-4 cursor-text ${nameError ? "border-red-300" : "border-black/10 dark:border-white/20"}`}>
            <span className="flex-1 text-[15px]">Namn</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                onBlur={handleNameSave}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                maxLength={60}
                placeholder="–"
                style={{ width: `${Math.max(1, name.length)}ch` }}
                className="text-[15px] bg-transparent outline-none text-right"
              />
              {saving && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />}
            </div>
          </label>
          {nameError && (
            <span className="text-[12px] text-red-500">{nameError}</span>
          )}
        </div>

        {/* Weight field */}
        <label className="border border-black/10 dark:border-white/20 rounded-card flex items-center pl-6 pr-4 py-4 cursor-text">
          <span className="flex-1 text-[15px]">Vikt</span>
          <div className="flex items-center gap-1">
            {savingWeight && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />}
            <input
              type="number"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onBlur={handleWeightSave}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              placeholder="–"
              style={{ width: `${Math.max(1, weightInput.length)}ch` }}
              className="text-[15px] bg-transparent outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[15px] opacity-50">kg</span>
          </div>
        </label>

        {/* Age field */}
        <label className="border border-black/10 dark:border-white/20 rounded-card flex items-center pl-6 pr-4 py-4 cursor-text">
          <span className="flex-1 text-[15px]">Ålder</span>
          <div className="flex items-center gap-1">
            {savingAge && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />}
            <input
              type="number"
              inputMode="numeric"
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              onBlur={handleAgeSave}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              placeholder="–"
              style={{ width: `${Math.max(1, ageInput.length)}ch` }}
              className="text-[15px] bg-transparent outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[15px] opacity-50">år</span>
          </div>
        </label>

        {/* Sex selector */}
        <div className="border border-black/10 dark:border-white/20 rounded-card flex items-center pl-6 pr-4 py-3">
          <span className="flex-1 text-[15px]">Välj kön</span>
          <div className="flex rounded-full border border-black/10 dark:border-white/20 p-[5px] gap-[2px]">
            {sexOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setUserSex(userSex === value ? null : value)}
                className={`px-4 py-[6px] rounded-full text-[12px] font-bold uppercase tracking-wider transition-colors ${
                  userSex === value
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "text-black/40 dark:text-white/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body measurements card */}
        <button
          type="button"
          onClick={() => navigate('/body')}
          className="border border-black/10 dark:border-white/20 rounded-card flex overflow-hidden w-full text-left"
          style={{ height: 136 }}
        >
          <div className="flex-1 flex flex-col justify-between pl-6 pt-6 pb-6">
            <p className="text-[15px] font-medium leading-snug opacity-80">
              Lägg till och följ<br />din måttutveckling
            </p>
            <IconArrowLeft size={16} className="rotate-180" />
          </div>
          <div className="flex-shrink-0 self-center" style={{ width: 160, height: 210 }}>
            <BodyModelPreview sex={userSex} />
          </div>
        </button>

      </div>

      {/* Settings section */}
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">Inställningar</span>

        <div className="flex flex-col gap-2">
          {/* Appearance row */}
          <div className="border border-black/10 dark:border-white/20 rounded-card flex items-center pl-6 pr-4 py-3">
            <span className="flex-1 text-[15px]">Utseende</span>
            <div className="flex rounded-full border border-black/10 dark:border-white/20 p-[5px] gap-[2px]">
              {appearanceOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAppearance(value)}
                  className={`px-4 py-[6px] rounded-full text-[12px] font-bold uppercase tracking-wider transition-colors ${
                    appearance === value
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "text-black/40 dark:text-white/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Show calories toggle */}
          <div className="border border-black/10 dark:border-white/20 rounded-card flex items-center pl-6 pr-4 py-3">
            <span className="flex-1 text-[15px]">Visa kalorier</span>
            <div className="flex rounded-full border border-black/10 dark:border-white/20 p-[5px] gap-[2px]">
              {([{ value: true, label: "Ja" }, { value: false, label: "Nej" }] as const).map(({ value, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setShowCalories(value)}
                  className={`px-4 py-[6px] rounded-full text-[12px] font-bold uppercase tracking-wider transition-colors ${
                    showCalories === value
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "text-black/40 dark:text-white/40"
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

      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">Konto</span>

        {/* Email field */}
        <div className="border border-black/10 dark:border-white/20 rounded-card flex flex-col pl-6 pr-4 py-3 opacity-50">
          <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
            E-postadress
          </span>
          <input
            type="email"
            value={user?.email ?? ""}
            disabled
            className="text-[15px] bg-transparent outline-none cursor-not-allowed"
          />
        </div>

        {/* Password field */}
        <div className="border border-black/10 dark:border-white/20 rounded-card flex items-center pl-6 pr-4 py-3">
          <div className="flex flex-col flex-1 opacity-50">
            <span className="text-[12px] font-bold uppercase tracking-wider opacity-50">
              Lösenord
            </span>
            <span className="text-[15px]">*********</span>
          </div>
          <button
            type="button"
            onClick={() => { setShowPasswordModal(true); setPasswordError(null); setPasswordSuccess(false); }}
            className="px-4 py-2 rounded-button text-[12px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 transition-colors"
          >
            Ändra
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Logout */}
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 rounded-full px-6 py-5 text-[12px] font-bold uppercase tracking-wider text-white transition-colors"
        >
          Logga ut
          <IconLogout size={18} />
        </button>

        {/* Delete account */}
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={deleting}
          className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-red-500 opacity-70 hover:opacity-100 transition-opacity mx-auto"
        >
          {deleting ? "Tar bort..." : "Ta bort konto"}
          <IconTrash size={16} />
        </button>
      </div>

      <Modal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordError(null); }}
        title="Ändra lösenord"
      >
        <div className="flex flex-col gap-3">
          {/* Current password */}
          <label className="border border-black/10 dark:border-white/20 rounded-card flex items-center pl-6 pr-4 py-4 cursor-text">
            <span className="flex-1 text-[15px]">Nuvarande</span>
            <input
              type={showCurrentPw ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="text-[15px] bg-transparent outline-none text-right w-28"
            />
            <button type="button" onClick={(e) => { e.preventDefault(); setShowCurrentPw(v => !v); }} className="ml-2 opacity-40 hover:opacity-70 transition-opacity">
              {showCurrentPw ? <IconHide size={16} /> : <IconShow size={16} />}
            </button>
          </label>

          {/* New password */}
          <label className="border border-black/10 dark:border-white/20 rounded-card flex items-center pl-6 pr-4 py-4 cursor-text">
            <span className="flex-1 text-[15px]">Nytt</span>
            <input
              type={showNewPw ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="text-[15px] bg-transparent outline-none text-right w-28"
            />
            <button type="button" onClick={(e) => { e.preventDefault(); setShowNewPw(v => !v); }} className="ml-2 opacity-40 hover:opacity-70 transition-opacity">
              {showNewPw ? <IconHide size={16} /> : <IconShow size={16} />}
            </button>
          </label>

          {/* Confirm new password */}
          <label className="border border-black/10 dark:border-white/20 rounded-card flex items-center pl-6 pr-4 py-4 cursor-text">
            <span className="flex-1 text-[15px]">Bekräfta</span>
            <input
              type={showConfirmPw ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSave(); }}
              placeholder="••••••••"
              className="text-[15px] bg-transparent outline-none text-right w-28"
            />
            <button type="button" onClick={(e) => { e.preventDefault(); setShowConfirmPw(v => !v); }} className="ml-2 opacity-40 hover:opacity-70 transition-opacity">
              {showConfirmPw ? <IconHide size={16} /> : <IconShow size={16} />}
            </button>
          </label>

          {passwordError && <span className="text-[12px] text-red-500 text-center">{passwordError}</span>}
          {passwordSuccess && <span className="text-[12px] text-green-500 text-center">Lösenord uppdaterat!</span>}

          <button
            type="button"
            onClick={handlePasswordSave}
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            className={`w-full py-4 rounded-full text-[12px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center ${
              !savingPassword && currentPassword && newPassword && confirmPassword
                ? "bg-black dark:bg-white text-white dark:text-black"
                : "bg-black/5 dark:bg-white/10 text-black/30 dark:text-white/30"
            }`}
          >
            {savingPassword
              ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : "Spara nytt lösenord"
            }
          </button>
        </div>
      </Modal>

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
