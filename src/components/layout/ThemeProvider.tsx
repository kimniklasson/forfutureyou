import { useEffect, type ReactNode } from "react";
import { useSettingsStore } from "../../stores/useSettingsStore";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const appearance = useSettingsStore((s) => s.appearance);

  useEffect(() => {
    const html = document.documentElement;
    const applyTheme = (dark: boolean) => {
      html.setAttribute("data-theme", dark ? "dark" : "light");
    };

    if (appearance === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyTheme(appearance === "mörkt");
    }
  }, [appearance]);

  return <>{children}</>;
}
