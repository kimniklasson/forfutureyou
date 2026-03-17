import { useNavigate, useLocation } from "react-router-dom";
import { IconHome, IconProfile, IconSessions } from "../ui/icons";
import { useSessionStore } from "../../stores/useSessionStore";

const NAV_ITEMS = [
  { path: "/", Icon: IconHome, label: "Hem" },
  { path: "/history", Icon: IconSessions, label: "Historik" },
  { path: "/profile", Icon: IconProfile, label: "Profil" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeSession } = useSessionStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-60 pointer-events-none">
      <div className="mx-auto max-w-[600px]">
        <div
          className="flex items-end justify-around px-6 pb-12 pt-14"
          style={{ background: activeSession ? "transparent" : "var(--footer-bg)" }}
        >
          {NAV_ITEMS.map(({ path, Icon, label }) => {
            const isActive = path === "/"
              ? location.pathname === "/" || location.pathname.startsWith("/category")
              : location.pathname.startsWith(path);
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
