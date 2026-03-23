import { useState } from "react";
import { useCategoryStore } from "../../stores/useCategoryStore";

interface CreateCategoryInputProps {
  onCreated?: (id: string) => void;
}

export function CreateCategoryInput({ onCreated }: CreateCategoryInputProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const createCategory = useCategoryStore((s) => s.createCategory);
  const reorderCategories = useCategoryStore((s) => s.reorderCategories);

  const canCreate = name.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate || saving) return;
    setSaving(true);
    const category = await createCategory(name.trim());
    // Category is already at top in local state (optimistic prepend in store).
    setName("");
    setSaving(false);
    onCreated?.(category.id);
    // Persist order to server in background (no await — don't block UI)
    const categories = useCategoryStore.getState().categories;
    reorderCategories(categories.map((c) => c.id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreate();
  };

  return (
    <div className="border border-black/10 dark:border-white/20 rounded-card flex items-center gap-2 pl-6 pr-4 py-4">
      <input
        type="text"
        placeholder="Skapa ett pass"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 text-[15px] bg-transparent outline-none"
      />
      <button
        onClick={handleCreate}
        disabled={!canCreate || saving}
        className={`px-[14px] py-2 rounded-button text-[12px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center ${
          canCreate && !saving
            ? "bg-black dark:bg-white text-white dark:text-black"
            : "bg-black/5 dark:bg-white/10 text-black/30 dark:text-white/30"
        }`}
      >
        {saving
          ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : "Skapa"
        }
      </button>
    </div>
  );
}
