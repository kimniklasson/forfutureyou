import { useNavigate, useLocation } from "react-router-dom";
import { IconButton } from "../ui/IconButton";
import { IconArrowLeft } from "../ui/icons";

// Top-level routes that live in the bottom nav — no back arrow here
const TOP_LEVEL = ["/", "/profile", "/history"];

function Logo() {
  return (
    <svg width="48" height="16" viewBox="0 0 48 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 0V16H4V0H6ZM10 0V7H38V0H40V16H38V9H10V16H8V0H10ZM44 0V16H42V0H44ZM2 4V12H0V4H2ZM48 4V12H46V4H48Z" fill="currentColor"/>
    </svg>
  );
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isTopLevel = TOP_LEVEL.includes(location.pathname);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-[600px] pointer-events-auto">
        <div
          className="flex items-center gap-2 px-6 py-8 justify-center"
          style={{ background: "var(--header-bg)" }}
        >
          {/* Left — back arrow, hidden on top-level to keep header height stable */}
          <div className="flex-1 flex items-center gap-1">
            <IconButton
              onClick={() => navigate(-1)}
              className={isTopLevel ? "invisible pointer-events-none" : ""}
            >
              <IconArrowLeft size={16} />
            </IconButton>
          </div>

          {/* Center logo — tap to go home */}
          <button onClick={() => navigate("/")} className="!transform-none" aria-label="Hem">
            <Logo />
          </button>

          {/* Right — empty, keeps logo centered */}
          <div className="flex-1" />
        </div>
      </div>
    </div>
  );
}
