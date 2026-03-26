export const CATEGORY_COLORS = [
  "#FFD900", "#6366f1", "#ef4444", "#22c55e", "#f97316", "#06b6d4",
  "#a855f7", "#ec4899", "#84cc16",
];

export function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
