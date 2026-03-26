import { useRef, useEffect, useState, useMemo } from "react";

export interface ChartSeries {
  key: string;
  label: string;    // category name, shown in tooltip
  color: string;
  points: { timeKey: string; displayLabel: string; value: number }[];
}

interface TooltipInfo {
  seriesKey: string;
  pointIdx: number;
}

interface Props {
  seriesList: ChartSeries[];
  showBaseline?: boolean;   // dashed line at value=100
  formatValue?: (v: number) => string;
}

const CHART_HEIGHT = 156;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 6;
const PADDING_LEFT = 8;
const PADDING_RIGHT = 8;

export function StatsMultiLineChart({ seriesList, showBaseline = false, formatValue }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Stable string key — only changes when the set of categories changes
  const seriesKey = useMemo(() => seriesList.map((s) => s.key).join(","), [seriesList]);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Reset when categories change so the next width update re-triggers animation
    hasAnimated.current = false;
    setAnimate(false);
  }, [seriesKey]);

  useEffect(() => {
    if (width === 0 || hasAnimated.current) return;
    hasAnimated.current = true;
    const t = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(t);
  }, [width, seriesKey]);

  useEffect(() => {
    if (tooltip === null) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTooltip(null);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [tooltip]);

  const allTimeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const s of seriesList) {
      for (const p of s.points) keys.add(p.timeKey);
    }
    return Array.from(keys).sort();
  }, [seriesList]);

  const hasEnoughData = allTimeKeys.length >= 2;

  // Global y bounds — always include 100 as reference when baseline shown
  const allValues = seriesList.flatMap((s) => s.points.map((p) => p.value));
  if (allValues.length === 0) allValues.push(0, 100);
  const globalMin = Math.min(...allValues, showBaseline ? 100 : Infinity);
  const globalMax = Math.max(...allValues, showBaseline ? 100 : -Infinity);
  const range = globalMax - globalMin || 1;
  const minVal = globalMin - range * 0.08;
  const maxVal = globalMax + range * 0.08;
  const displayRange = maxVal - minVal;

  const chartW = width - PADDING_LEFT - PADDING_RIGHT;
  const chartH = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  function xForKey(timeKey: string) {
    const idx = allTimeKeys.indexOf(timeKey);
    if (allTimeKeys.length === 1) return PADDING_LEFT + chartW / 2;
    return PADDING_LEFT + (idx / (allTimeKeys.length - 1)) * chartW;
  }

  function yForValue(value: number) {
    return PADDING_TOP + chartH - ((value - minVal) / displayRange) * chartH;
  }

  const baselineY = yForValue(100);

  // Tooltip constants
  const TOOLTIP_PX = 8;
  const TOOLTIP_PY = 6;
  const TOOLTIP_FS = 11;
  const TOOLTIP_CW = 6.2;
  const TOOLTIP_LINE_GAP = 4;
  const TOOLTIP_H = TOOLTIP_FS * 2 + TOOLTIP_LINE_GAP + TOOLTIP_PY * 2;
  const ARROW = 5;
  const DOT_R = 3.5;
  const HIT = 12;

  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <div ref={containerRef} className="w-full">
      {width > 0 && hasEnoughData && (
        <svg
          width={width}
          height={CHART_HEIGHT}
          className="block overflow-visible"
          onPointerDown={() => setTooltip(null)}
        >
          {/* Dashed 100% baseline */}
          {showBaseline && (
            <line
              x1={PADDING_LEFT}
              y1={baselineY}
              x2={width - PADDING_RIGHT}
              y2={baselineY}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          )}


          {/* Series */}
          {seriesList.map((s) => {
            const pts = s.points.map((p) => ({
              x: xForKey(p.timeKey),
              y: yForValue(p.value),
              p,
            }));
            if (pts.length === 0) return null;

            const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");

            return (
              <g key={s.key}>
                <polyline
                  points={polyline}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: animate ? 0 : 1,
                    transition: "stroke-dashoffset 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
                {pts.map(({ x, y, p }, i) => {
                  const isSelected = tooltip?.seriesKey === s.key && tooltip?.pointIdx === i;
                  const line1 = s.label;
                  const line2 = `${p.displayLabel} · ${fmt(p.value)}`;
                  const tooltipW = Math.max(line1.length, line2.length) * TOOLTIP_CW + TOOLTIP_PX * 2;
                  const rawTx = x - tooltipW / 2;
                  const tx = Math.max(0, Math.min(rawTx, width - tooltipW));
                  const ty = y - DOT_R - ARROW - TOOLTIP_H;

                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r={DOT_R}
                        fill={s.color}
                        opacity={animate ? 1 : 0}
                        style={{ transition: `opacity 0.3s ease ${0.4 + i * 0.04}s` }}
                      />
                      <rect
                        x={x - HIT}
                        y={y - HIT}
                        width={HIT * 2}
                        height={HIT * 2}
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setTooltip(isSelected ? null : { seriesKey: s.key, pointIdx: i });
                        }}
                      />
                      {isSelected && (
                        <g pointerEvents="none">
                          <rect
                            x={tx}
                            y={ty}
                            width={tooltipW}
                            height={TOOLTIP_H}
                            rx={6}
                            fill="black"
                            className="dark:fill-white"
                          />
                          <text
                            x={tx + tooltipW / 2}
                            textAnchor="middle"
                            fill="white"
                            className="dark:fill-black"
                            fontSize={TOOLTIP_FS}
                            fontWeight={600}
                          >
                            <tspan x={tx + tooltipW / 2} y={ty + TOOLTIP_PY + TOOLTIP_FS - 1}>{line1}</tspan>
                            <tspan x={tx + tooltipW / 2} dy={TOOLTIP_FS + TOOLTIP_LINE_GAP} fontWeight={400} fillOpacity={0.7}>{line2}</tspan>
                          </text>
                          <polygon
                            points={`${x - ARROW},${y - DOT_R - ARROW} ${x + ARROW},${y - DOT_R - ARROW} ${x},${y - DOT_R}`}
                            fill="black"
                            className="dark:fill-white"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
