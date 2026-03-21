import { useRef, useEffect, useState } from "react";

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  unit?: string;
}

const CHART_HEIGHT = 120;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 16;
const PADDING_LEFT = 36;
const PADDING_RIGHT = 12;

export function StatsLineChart({ data, unit = "kg" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [selectedDot, setSelectedDot] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, [data]);

  // Dismiss tooltip on outside click
  useEffect(() => {
    if (selectedDot === null) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelectedDot(null);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [selectedDot]);

  if (data.length === 0) {
    return (
      <div className="rounded-card border border-black/10 dark:border-white/10 p-4">
        <p className="text-[13px] opacity-50 text-center">Ingen data ännu</p>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const chartW = width - PADDING_LEFT - PADDING_RIGHT;
  const chartH = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const points = data.map((d, i) => {
    const x = PADDING_LEFT + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
    const y = PADDING_TOP + chartH - ((d.value - minVal) / range) * chartH;
    return { x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  const areaPoints = [
    `${points[0].x},${PADDING_TOP + chartH}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${points[points.length - 1].x},${PADDING_TOP + chartH}`,
  ].join(" ");

  const gridLines = [0, 0.5, 1].map((frac) => ({
    y: PADDING_TOP + chartH - frac * chartH,
    value: Math.round(minVal + frac * range),
  }));

  let lineLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    lineLength += Math.sqrt(dx * dx + dy * dy);
  }

  // Tooltip sizing
  const TOOLTIP_PADDING_X = 8;
  const TOOLTIP_PADDING_Y = 5;
  const TOOLTIP_FONT_SIZE = 11;
  const TOOLTIP_CHAR_WIDTH = 6.2;
  const TOOLTIP_HEIGHT = TOOLTIP_FONT_SIZE + TOOLTIP_PADDING_Y * 2;
  const ARROW_SIZE = 5;
  const DOT_R = 4;
  const HIT = 12; // half of 24px hit area

  return (
    <div
      ref={containerRef}
      className="rounded-card border border-black/10 dark:border-white/10 p-4 overflow-hidden"
    >
      {width > 0 && (
        <svg
          width={width}
          height={CHART_HEIGHT}
          className="block overflow-visible"
          onPointerDown={() => setSelectedDot(null)}
        >
          {/* Grid lines */}
          {gridLines.map((gl) => (
            <g key={gl.y}>
              <line
                x1={PADDING_LEFT}
                y1={gl.y}
                x2={width - PADDING_RIGHT}
                y2={gl.y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text
                x={PADDING_LEFT - 6}
                y={gl.y + 3.5}
                textAnchor="end"
                fill="currentColor"
                fillOpacity={0.4}
                fontSize={10}
              >
                {gl.value}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <polygon
            points={areaPoints}
            fill="#F5C800"
            fillOpacity={animate ? 0.12 : 0}
            style={{ transition: "fill-opacity 0.6s ease" }}
          />

          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke="#F5C800"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={lineLength}
            strokeDashoffset={animate ? 0 : lineLength}
            style={{ transition: `stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)` }}
          />

          {/* Dots + hit areas + tooltips */}
          {points.map((p, i) => {
            const isSelected = selectedDot === i;
            const d = data[i];
            const tooltipText = `${d.label} · ${d.value} ${unit}`;
            const tooltipW = tooltipText.length * TOOLTIP_CHAR_WIDTH + TOOLTIP_PADDING_X * 2;
            // Clamp tooltip so it doesn't overflow chart width
            const rawTx = p.x - tooltipW / 2;
            const tx = Math.max(0, Math.min(rawTx, width - tooltipW));
            const ty = p.y - DOT_R - ARROW_SIZE - TOOLTIP_HEIGHT;

            return (
              <g key={i}>
                {/* Visible dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={DOT_R}
                  fill="currentColor"
                  opacity={animate ? 1 : 0}
                  style={{ transition: `opacity 0.3s ease ${0.3 + i * 0.03}s` }}
                />

                {/* Transparent 24×24 hit area */}
                <rect
                  x={p.x - HIT}
                  y={p.y - HIT}
                  width={HIT * 2}
                  height={HIT * 2}
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedDot(isSelected ? null : i);
                  }}
                />

                {/* Tooltip */}
                {isSelected && (
                  <g pointerEvents="none">
                    {/* Background */}
                    <rect
                      x={tx}
                      y={ty}
                      width={tooltipW}
                      height={TOOLTIP_HEIGHT}
                      rx={6}
                      fill="black"
                      className="dark:fill-white"
                    />
                    {/* Text */}
                    <text
                      x={tx + tooltipW / 2}
                      y={ty + TOOLTIP_PADDING_Y + TOOLTIP_FONT_SIZE - 1}
                      textAnchor="middle"
                      fill="white"
                      className="dark:fill-black"
                      fontSize={TOOLTIP_FONT_SIZE}
                      fontWeight={600}
                    >
                      {tooltipText}
                    </text>
                    {/* Arrow */}
                    <polygon
                      points={`${p.x - ARROW_SIZE},${p.y - DOT_R - ARROW_SIZE} ${p.x + ARROW_SIZE},${p.y - DOT_R - ARROW_SIZE} ${p.x},${p.y - DOT_R}`}
                      fill="black"
                      className="dark:fill-white"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* Unit label */}
      <div className="flex justify-end mt-1">
        <span className="text-[11px] opacity-40">{unit}</span>
      </div>
    </div>
  );
}
