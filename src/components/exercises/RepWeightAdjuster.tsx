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
  const displayValue = isBodyweight
    ? value === 0
      ? "Kroppsvikt"
      : `Kroppsvikt + ${value} ${label}`
    : `${value} ${label}`;

  return (
    <div className="bg-white dark:bg-[#2c2c2e] rounded-button flex items-center h-8">
      <button
        onClick={() => onChange(Math.max(0, value - step))}
        className="w-16 h-full flex items-center justify-center rounded-button"
      >
        <IconMinus size={16} />
      </button>
      <div className="flex-1 flex items-center justify-center px-6">
        <span className="font-bold text-[12px] text-center whitespace-nowrap">
          {displayValue}
        </span>
      </div>
      <button
        onClick={() => onChange(value + step)}
        className="w-16 h-full flex items-center justify-center rounded-button"
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}
