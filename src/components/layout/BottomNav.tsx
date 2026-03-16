import { useNavigate, useLocation } from "react-router-dom";
import { IconHome, IconProfile, IconSessions } from "../ui/icons";

const NAV_ITEMS = [
  { path: "/", Icon: IconHome, label: "Hem" },
  { path: "/profile", Icon: IconProfile, label: "Profil" },
  { path: "/history", Icon: IconSessions, label: "Historik" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-[600px] pointer-events-auto">
        <div
          className="flex items-end justify-around px-6 pb-12 pt-14"
          style={{ background: "var(--footer-bg)" }}
        >
          {NAV_ITEMS.map(({ path, Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                aria-label={label}
                className={`w-12 h-12 flex items-center justify-center transition-opacity ${
                  isActive ? "opacity-100" : "opacity-50"
                }`}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
