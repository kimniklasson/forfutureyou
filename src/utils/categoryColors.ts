// Pattern: stark, grå, grå, stark, grå, grå — sedan opacitetsvarianter
const BASE_COLORS = [
  "#FFD900", // 1 – stark
  "#555555", // 2 – grå
  "#BBBBBB", // 3 – grå
  "#FF6600", // 4 – stark
  "#777777", // 5 – grå
  "#EEEEEE", // 6 – grå
];
const EXTRA_OPACITIES = [0.7, 0.5, 0.35];

export function getCategoryColor(index: number): string {
  if (index < BASE_COLORS.length) return BASE_COLORS[index];
  const cycle = index - BASE_COLORS.length;
  const opacityIdx = Math.floor(cycle / BASE_COLORS.length);
  const colorIdx = cycle % BASE_COLORS.length;
  const opacity = EXTRA_OPACITIES[Math.min(opacityIdx, EXTRA_OPACITIES.length - 1)];
  const hex = BASE_COLORS[colorIdx];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// Exporteras för komponenter som behöver hela paletten (t.ex. stapeldiagram)
export { BASE_COLORS };
