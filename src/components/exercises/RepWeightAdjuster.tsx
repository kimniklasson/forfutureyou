import { useState, useRef, useEffect } from "react";
import { IconMinus, IconPlus } from "../ui/icons";

interface RepWeightAdjusterProps {
  value: number;
  label: string;
  isBodyweight?: boolean;
  step?: number;
  onChange: (newValue: number) => void;
}

export function RepWeightAdjuster({
  value,
  label,
  isBodyweight = false,
  step = 1,
  onChange,
}: RepWeightAdjusterProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const displayValue = isBodyweight
    ? value === 0
      ? "Kroppsvikt"
      : `Kroppsvikt + ${value} ${label}`
    : `${value} ${label}`;

  const handleDisplayClick = () => {
    setInputValue(value.toString());
    setIsEditing(true);
  };

  const commitEdit = () => {
    const parsed = label === "kg" ? parseFloat(inputValue) : parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-[#2c2c2e] rounded-card flex items-center h-10">
      <button
        onClick={() => onChange(Math.max(0, value - step))}
        className="w-16 h-full flex items-center justify-center rounded-card"
      >
        <IconMinus size={16} />
      </button>
      <div className="flex-1 flex items-center justify-center px-2">
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full text-center font-bold text-[15px] bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <span
            className="font-bold text-[15px] text-center whitespace-nowrap cursor-text select-none"
            onClick={handleDisplayClick}
          >
            {displayValue}
          </span>
        )}
      </div>
      <button
        onClick={() => onChange(value + step)}
        className="w-16 h-full flex items-center justify-center rounded-card"
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}
