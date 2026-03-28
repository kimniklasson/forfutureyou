import { useNavigate, useLocation } from "react-router-dom";
import { IconHome, IconProfile, IconSessions, IconStats } from "../ui/icons";
import { useSessionStore } from "../../stores/useSessionStore";
import { NAV } from "../../constants/ui-strings";
import { BLUR_LAYERS } from "../../utils/zIndex";

const NAV_ITEMS = [
  { path: "/", Icon: IconHome, label: NAV.HOME, subPaths: [] as string[] },
  { path: "/history", Icon: IconSessions, label: NAV.HISTORY, subPaths: [] as string[] },
  { path: "/stats", Icon: IconStats, label: NAV.STATISTICS, subPaths: [] as string[] },
  { path: "/profile", Icon: IconProfile, label: NAV.PROFILE, subPaths: ["/body"] },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeSession } = useSessionStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-60 pointer-events-none">
      <div className="mx-auto max-w-[600px] relative">

        {/* Progressive blur + gradient — extends 16px above the icon row */}
        {!activeSession && (
          <>
            {BLUR_LAYERS.map(({ blur, stop }) => (
              <div
                key={blur}
                className="absolute inset-x-0 bottom-0"
                style={{
                  top: "-16px",
                  backdropFilter: `blur(${blur})`,
                  WebkitBackdropFilter: `blur(${blur})`,
                  maskImage: `linear-gradient(to top, black 0%, transparent ${stop})`,
                  WebkitMaskImage: `linear-gradient(to top, black 0%, transparent ${stop})`,
                }}
              />
            ))}
            <div
              className="absolute inset-x-0 bottom-0"
              style={{ top: "-16px", background: "var(--footer-bg)" }}
            />
          </>
        )}

        {/* Click blocker — covers the full footer area so taps don't fall through */}
        {!activeSession && <div className="absolute inset-0 pointer-events-auto" />}

        {/* Nav icons — z-10 so they sit above the blur layers, unaffected */}
        <div className="relative z-10 flex items-end justify-around px-6 pb-10 pt-16">
          {NAV_ITEMS.map(({ path, Icon, label, subPaths }) => {
            const isActive = path === "/"
              ? location.pathname === "/" || location.pathname.startsWith("/category")
              : location.pathname.startsWith(path) || subPaths.some(sp => location.pathname.startsWith(sp));
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                aria-label={label}
                className={`w-12 h-12 flex items-center justify-center transition-opacity pointer-events-auto ${
                  activeSession ? "text-black" : "text-black dark:text-white"
                } ${isActive ? "opacity-100" : "opacity-50"}`}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
