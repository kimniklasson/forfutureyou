import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { SessionTimerBar } from "./SessionTimerBar";
import { useSessionStore } from "../../stores/useSessionStore";

export function AppShell() {
  const hasSession = useSessionStore((s) => s.activeSession !== null);
  const location = useLocation();

  return (
    <div className="mx-auto max-w-[600px] min-h-full bg-white dark:bg-[#111111] relative">
      <Header />
      <main className={`pt-32 px-8 pb-6 ${hasSession ? "pb-28" : "pb-6"}`}>
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>
      <SessionTimerBar />
    </div>
  );
}
