import { useNavigate, useLocation, useMatch } from "react-router-dom";
import { IconButton } from "../ui/IconButton";
import { IconArrowLeft, IconPlus } from "../ui/icons";

// Top-level routes that live in the bottom nav — no back arrow here
const TOP_LEVEL = ["/", "/profile", "/history", "/stats", "/login", "/signup"];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isTopLevel = TOP_LEVEL.includes(location.pathname);
  const isCategoryPage = useMatch("/category/:id");

  const handleAddExercise = () => {
    window.dispatchEvent(new CustomEvent("open-exercise-modal"));
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-[600px] pointer-events-auto">
        <div
          className="flex items-center gap-2 px-6 pt-6 pb-10 justify-center"
          style={{ background: "var(--header-bg)" }}
        >
          {/* Left — back arrow, hidden on top-level to keep header height stable */}
          <div className="flex-1 flex items-center gap-1">
            <IconButton
              onClick={() => navigate(-1)}
              className={isTopLevel ? "invisible pointer-events-none" : ""}
            >
              <IconArrowLeft size={20} />
            </IconButton>
          </div>

          {/* Center — spacer for SharedForFutureYou */}
          <div className="w-[120px]" aria-hidden="true" />

          {/* Right — "+" button on category pages */}
          <div className="flex-1 flex justify-end">
            {isCategoryPage && (
              <IconButton onClick={handleAddExercise} aria-label="Lägg till övning">
                <IconPlus size={20} />
              </IconButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
