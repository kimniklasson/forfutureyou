import { useState, useEffect, useRef } from "react";
import type { SessionStats, ExerciseInsight } from "../../utils/statistics";

interface Props {
  stats: SessionStats;
  insights: ExerciseInsight;
}

const CATEGORY_COLORS = [
  "#FFD900", "#6366f1", "#ef4444", "#22c55e", "#f97316", "#06b6d4",
  "#a855f7", "#ec4899", "#84cc16",
];

const SIZE = 128;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 46;
const SW = 11; // stroke width
const GAP_DEG = 3;

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

// ── Intensity Ring ──────────────────────────────────────────

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
    <div className="flex-1 bg-card rounded-card p-4 flex flex-col items-center gap-3">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE}>
          {/* Track */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={SW}
          />
          {/* Progress */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={SW}
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[26px] font-bold tabular-nums">{intensity}</span>
        </div>
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wider opacity-50">
        ~Intensitet
      </span>
    </div>
  );
}

// ── Category Donut ──────────────────────────────────────────

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

  // Close tooltip on outside click
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
    const gapBefore = i === 0 ? GAP_DEG / 2 : GAP_DEG / 2;
    const gapAfter = GAP_DEG / 2;
    const startDeg = cursor + gapBefore;
    const endDeg = cursor + fullDeg - gapAfter;
    cursor += fullDeg;
    if (endDeg > startDeg + 0.5) {
      segments.push({
        categoryName: cat.categoryName,
        sessionCount: cat.sessionCount,
        pct,
        startDeg,
        endDeg,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      });
    }
  }

  const activeSegment = activeIdx !== null ? segments[activeIdx] : null;

  return (
    <div className="flex-1 bg-card rounded-card p-4 flex flex-col items-center gap-3" ref={cardRef}>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE}>
          {!hasData ? (
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={SW}
            />
          ) : (
            segments.map((seg, i) => {
              const totalArcLen = arcLength(seg.endDeg - seg.startDeg);
              return (
                <path
                  key={seg.categoryName}
                  d={arcPath(seg.startDeg, seg.endDeg)}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={activeIdx === i ? SW + 3 : SW}
                  strokeLinecap="round"
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
            })
          )}
        </svg>

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            width="22" height="22" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            opacity={0.35}
          >
            {/* Barbell */}
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="6" y1="9" x2="6" y2="15" />
            <line x1="18" y1="9" x2="18" y2="15" />
            <line x1="3" y1="10" x2="3" y2="14" />
            <line x1="21" y1="10" x2="21" y2="14" />
          </svg>
        </div>

        {/* Tooltip inside SVG area */}
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

// ── Export ──────────────────────────────────────────────────

export function StatsOverviewCards({ stats, insights }: Props) {
  return (
    <div className="flex gap-3">
      <IntensityCard score={stats.avgIntensityScore} />
      <CategoryCard insights={insights} />
    </div>
  );
}
