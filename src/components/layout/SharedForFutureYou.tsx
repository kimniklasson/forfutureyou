import { useLocation, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";

const LINES = ["For", "future", "you."];
const HEADER_SCALE = 0.2;
const HERO_TOP = 112;
const HEADER_TOP = 43;
const SCROLL_THRESHOLD = 100;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type Phase = "idle" | "hold-header" | "animate-to-hero";

export function SharedForFutureYou() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const [scrollProgress, setScrollProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const prevIsHome = useRef(isHome);
  const textRef = useRef<HTMLDivElement>(null);

  // Scroll tracking on home page
  const onScroll = useCallback(() => {
    setScrollProgress(Math.min(window.scrollY / SCROLL_THRESHOLD, 1));
  }, []);

  useEffect(() => {
    if (!isHome || phase !== "idle") return;
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome, phase, onScroll]);

  // Detect return to home — hold at header position before animating
  useLayoutEffect(() => {
    if (isHome && !prevIsHome.current) {
      setPhase("hold-header");
      setScrollProgress(0);
    }
    prevIsHome.current = isHome;
  }, [isHome]);

  // Step 1: After paint at header position, start scale-up animation
  useEffect(() => {
    if (phase !== "hold-header") return;
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        setPhase("animate-to-hero");
      });
    });
    return () => { cancelled = true; };
  }, [phase]);

  // Step 2: After scale-up transition completes, replay letter-flex
  useEffect(() => {
    if (phase !== "animate-to-hero") return;
    const timer = setTimeout(() => {
      setPhase("idle");
      const spans = textRef.current?.querySelectorAll(".letter-flex");
      spans?.forEach((span) => span.classList.remove("letter-flex"));
      void textRef.current?.offsetWidth;
      spans?.forEach((span) => span.classList.add("letter-flex"));
    }, 500);
    return () => clearTimeout(timer);
  }, [phase]);

  // Calculate position and scale
  let top: number;
  let scale: number;
  let transition: string | undefined;

  if (!isHome) {
    top = HEADER_TOP;
    scale = HEADER_SCALE;
    transition = undefined;
  } else if (phase === "hold-header") {
    top = HEADER_TOP;
    scale = HEADER_SCALE;
    transition = "none";
  } else if (phase === "animate-to-hero") {
    top = HERO_TOP;
    scale = 1;
    transition = undefined;
  } else {
    top = lerp(HERO_TOP, HEADER_TOP, scrollProgress);
    scale = lerp(1, HEADER_SCALE, scrollProgress);
    transition = "none";
  }

  const isCollapsed = !isHome || scrollProgress >= 1;

  return (
    <div
      className="ffy-container"
      style={{ top, transition }}
      onClick={isCollapsed ? () => navigate("/") : undefined}
      role={isCollapsed ? "button" : undefined}
      aria-label={isCollapsed ? "Hem" : undefined}
    >
      <div
        ref={textRef}
        className="ffy-text"
        style={{
          fontSize: 96,
          lineHeight: "62%",
          letterSpacing: "-0.05em",
          textAlign: "center",
          color: "#FFD900",
          fontFamily: "var(--font-sans)",
          transform: `scale(${scale})`,
          transition,
        }}
      >
        {LINES.map((line, lineIdx) => (
          <div key={lineIdx}>
            {Array.from(line).map((char, charIdx) => (
              <span key={`${lineIdx}-${charIdx}`} className="letter-flex">
                {char}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
