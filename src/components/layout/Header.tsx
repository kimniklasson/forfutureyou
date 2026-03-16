import { useNavigate, useLocation } from "react-router-dom";
import { IconButton } from "../ui/IconButton";
import { IconArrowLeft, IconProfile, IconSessions } from "../ui/icons";

function Logo() {
  return (
    <svg width="48" height="16" viewBox="0 0 48 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 0V16H4V0H6ZM10 0V7H38V0H40V16H38V9H10V16H8V0H10ZM44 0V16H42V0H44ZM2 4V12H0V4H2ZM48 4V12H46V4H48Z" fill="black"/>
    </svg>
  );
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-[600px] pointer-events-auto">
        <div
          className="flex items-center gap-2 px-6 py-8 justify-center"
          style={{
            background: "linear-gradient(to bottom, white 26.9%, rgba(255,255,255,0))",
          }}
        >
          {/* Left */}
          <div className="flex-1 flex items-center gap-1">
            {!isHome && (
              <IconButton onClick={() => navigate(-1)}>
                <IconArrowLeft size={16} />
              </IconButton>
            )}
          </div>

          {/* Center logo — tap to go home */}
          <button onClick={() => navigate("/")} className="!transform-none" aria-label="Hem">
            <Logo />
          </button>

          {/* Right */}
          <div className="flex-1 flex items-center justify-end gap-1">
            <IconButton onClick={() => navigate("/profile")}>
              <IconProfile size={16} />
            </IconButton>
            <IconButton onClick={() => navigate("/history")}>
              <IconSessions size={16} />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}
