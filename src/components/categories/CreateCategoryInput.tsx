import { useState } from "react";
import { useCategoryStore } from "../../stores/useCategoryStore";

export function CreateCategoryInput() {
  const [name, setName] = useState("");
  const createCategory = useCategoryStore((s) => s.createCategory);

  const canCreate = name.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    await createCategory(name.trim());
    setName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreate();
  };

  return (
    <div className="border border-black/10 dark:border-white/20 rounded-card flex items-center gap-2 pl-6 pr-4 py-4">
      <input
        type="text"
        placeholder="Skapa en kategori"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 text-[15px] bg-transparent outline-none placeholder:opacity-30"
      />
      <button
        onClick={handleCreate}
        disabled={!canCreate}
        className={`px-3 py-2 rounded-button text-[12px] font-bold uppercase tracking-wider transition-colors ${
          canCreate
            ? "bg-black dark:bg-white text-white dark:text-black"
            : "bg-black/5 dark:bg-white/10 text-black/30 dark:text-white/30"
        }`}
      >
        Skapa
      </button>
    </div>
  );
}
