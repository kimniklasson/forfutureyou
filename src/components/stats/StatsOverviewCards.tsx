import { useState, useEffect, useRef } from "react";
import type { SessionStats, ExerciseInsight } from "../../utils/statistics";

interface Props {
  stats: SessionStats;
  insights: ExerciseInsight;
}

// ── Colors ──────────────────────────────────────────────────
// First 7 are used in order; beyond that, opacity variants are generated.
const BASE_COLORS = [
  "#FFD900", "#FFA100", "#FF6600",
  "#555555", "#EEEEEE", "#777777", "#BBBBBB",
];
const EXTRA_OPACITIES = [0.7, 0.5, 0.35];

function getCategoryColor(index: number): string {
  if (index < BASE_COLORS.length) return BASE_COLORS[index];
  const opacityIdx = Math.floor((index - BASE_COLORS.length) / BASE_COLORS.length);
  const colorIdx = (index - BASE_COLORS.length) % BASE_COLORS.length;
  const opacity = EXTRA_OPACITIES[Math.min(opacityIdx, EXTRA_OPACITIES.length - 1)];
  const hex = BASE_COLORS[colorIdx];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// ── SVG helpers ──────────────────────────────────────────────
const SIZE = 148;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 56;
const SW = 12;
const GAP_DEG = 3.5;

function polarToCartesian(angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
}

function arcPath(startDeg: number, endDeg: number) {
  const s = polarToCartesian(startDeg);
  const e = polarToCartesian(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

function arcLength(angleDeg: number) {
  return (angleDeg / 360) * 2 * Math.PI * R;
}

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: "white",
  border: "1px solid rgba(0,0,0,0.10)",
};

// ── Intensity Ring ───────────────────────────────────────────

function IntensityCard({ score }: { score: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const intensity = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * R;
  const progressArc = (intensity / 100) * circumference;
  const dashOffset = animated ? circumference - progressArc : circumference;

  return (
    <div className="flex-1 rounded-card p-4 flex flex-col items-center gap-3" style={CARD_STYLE}>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE}>
          {/* Track */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="#f5f5f5"
            strokeWidth={SW}
          />
          {/* Progress */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={SW}
            strokeLinecap="butt"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[20px] font-bold tabular-nums">{intensity}</span>
        </div>
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wider opacity-50">
        ~Intensitet
      </span>
    </div>
  );
}

// ── Category Donut ───────────────────────────────────────────

interface Segment {
  categoryName: string;
  sessionCount: number;
  pct: number;
  startDeg: number;
  endDeg: number;
  color: string;
}

function CategoryCard({ insights }: { insights: ExerciseInsight }) {
  const [animated, setAnimated] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (activeIdx === null) return;
    const handler = () => setActiveIdx(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [activeIdx]);

  const total = insights.categoryBalance.reduce((s, c) => s + c.sessionCount, 0);
  const hasData = insights.categoryBalance.length > 0 && total > 0;

  const segments: Segment[] = [];
  let cursor = 0;
  for (let i = 0; i < insights.categoryBalance.length; i++) {
    const cat = insights.categoryBalance[i];
    const pct = cat.sessionCount / total;
    const fullDeg = pct * 360;
    const startDeg = cursor + GAP_DEG / 2;
    const endDeg = cursor + fullDeg - GAP_DEG / 2;
    cursor += fullDeg;
    if (endDeg > startDeg + 0.5) {
      segments.push({
        categoryName: cat.categoryName,
        sessionCount: cat.sessionCount,
        pct,
        startDeg,
        endDeg,
        color: getCategoryColor(i),
      });
    }
  }

  const activeSegment = activeIdx !== null ? segments[activeIdx] : null;

  return (
    <div className="flex-1 rounded-card p-4 flex flex-col items-center gap-3" style={CARD_STYLE} ref={cardRef}>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE}>
          {!hasData ? (
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="#f5f5f5"
              strokeWidth={SW}
            />
          ) : (
            <>
              {/* Full track ring */}
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f5f5f5" strokeWidth={SW} />
              {segments.map((seg, i) => {
                const totalArcLen = arcLength(seg.endDeg - seg.startDeg);
                return (
                  <path
                    key={seg.categoryName}
                    d={arcPath(seg.startDeg, seg.endDeg)}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={activeIdx === i ? SW + 3 : SW}
                    strokeLinecap="butt"
                    strokeDasharray={`${totalArcLen} 9999`}
                    strokeDashoffset={animated ? 0 : totalArcLen}
                    style={{
                      transition: `stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1) ${i * 0.07}s, stroke-width 0.15s ease`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIdx(activeIdx === i ? null : i);
                    }}
                    className="cursor-pointer"
                  />
                );
              })}
            </>
          )}
        </svg>

        {/* Center: IconHome */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            width="22" height="20" viewBox="0 0 18 16"
            fill="currentColor" opacity={0.35}
          >
            <path d="M4 7.25H13.5V1H15V15H13.5V8.75H4V15H2.5V1H4V7.25Z" />
            <path d="M1.5 12H0V4H1.5V12Z" />
            <path d="M17.5 12H16V4H17.5V12Z" />
          </svg>
        </div>

        {/* Tooltip */}
        {activeSegment && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/80 text-white rounded-lg px-3 py-1.5 text-center">
              <div className="text-[12px] font-medium leading-tight">
                {activeSegment.categoryName}
              </div>
              <div className="text-[11px] opacity-70">
                {Math.round(activeSegment.pct * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>

      <span className="text-[11px] font-medium uppercase tracking-wider opacity-50">
        Kategorier
      </span>
    </div>
  );
}

// ── Export ───────────────────────────────────────────────────

export function StatsOverviewCards({ stats, insights }: Props) {
  return (
    <div className="flex gap-3">
      <IntensityCard score={stats.avgIntensityScore} />
      <CategoryCard insights={insights} />
    </div>
  );
}
