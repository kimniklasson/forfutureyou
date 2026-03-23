import { useState } from "react";

export interface ExerciseFormData {
  name: string;
  baseReps: number;
  baseWeight: number;
  isBodyweight: boolean;
}

interface ExerciseFormFieldsProps {
  initialData?: Partial<ExerciseFormData>;
  onSubmit: (data: ExerciseFormData) => void;
  submitLabel: string;
}

export function ExerciseFormFields({
  initialData,
  onSubmit,
  submitLabel,
}: ExerciseFormFieldsProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [baseReps, setBaseReps] = useState(initialData?.baseReps?.toString() ?? "");
  const [baseWeight, setBaseWeight] = useState(initialData?.baseWeight?.toString() ?? "");
  const [isBodyweight, setIsBodyweight] = useState(initialData?.isBodyweight ?? false);

  const canSubmit = name.trim().length > 0 && baseReps.length > 0 && baseWeight.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      baseReps: parseInt(baseReps, 10) || 0,
      baseWeight: parseFloat(baseWeight) || 0,
      isBodyweight,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Name field */}
      <div className="flex flex-col gap-2">
        <label className="font-bold text-[12px] uppercase tracking-wider opacity-50">
          Namn på övning
        </label>
        <div className="border border-black/10 dark:border-white/20 rounded-card flex items-center pl-6 pr-4 py-4">
          <input
            type="text"
            placeholder="Fyll i t.ex. Hantelpress"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 text-[15px] bg-transparent outline-none"
          />
        </div>
      </div>

      {/* Base reps */}
      <div className="flex flex-col gap-2">
        <label className="font-bold text-[12px] uppercase tracking-wider opacity-50">
          Välj antal basrepetitioner
        </label>
        <div className="border border-black/10 dark:border-white/20 rounded-card flex items-center gap-6 pl-6 pr-4 py-4">
          <input
            type="number"
            placeholder="Fyll i t.ex. 8"
            value={baseReps}
            onChange={(e) => setBaseReps(e.target.value)}
            className="flex-1 text-[15px] bg-transparent outline-none"
          />
          <span className="text-[15px] text-right shrink-0">rep</span>
        </div>
      </div>

      {/* Base weight + bodyweight checkbox */}
      <div className="flex flex-col gap-2">
        <label className="font-bold text-[12px] uppercase tracking-wider opacity-50">
          Välj en basvikt
        </label>
        <div className="border border-black/10 dark:border-white/20 rounded-card flex items-center gap-6 pl-6 pr-4 py-4">
          <input
            type="number"
            placeholder="Fyll i t.ex. 30"
            value={baseWeight}
            onChange={(e) => setBaseWeight(e.target.value)}
            className="flex-1 text-[15px] bg-transparent outline-none"
          />
          <span className="text-[15px] text-right shrink-0">kg</span>
        </div>

        {/* Bodyweight checkbox */}
        <button
          onClick={() => setIsBodyweight(!isBodyweight)}
          className="bg-card flex items-center gap-2 p-3"
        >
          <span className="flex-1 font-bold text-[12px] uppercase tracking-wider opacity-50 text-left">
            Kroppsvikt?
          </span>
          <div
            className={`w-5 h-5 rounded-button border flex items-center justify-center ${
              isBodyweight
                ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black"
                : "bg-white dark:bg-[#2c2c2e] border-black/10 dark:border-white/20"
            }`}
          >
            {isBodyweight && (
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path
                  d="M1 5L4.5 8.5L11 1.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </button>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full py-4 px-[26px] rounded-button text-[12px] font-bold uppercase tracking-wider transition-colors ${
          canSubmit
            ? "bg-black dark:bg-white text-white dark:text-black"
            : "bg-black/5 dark:bg-white/10 text-black/30 dark:text-white/30"
        }`}
      >
        {submitLabel}
      </button>
    </div>
  );
}
