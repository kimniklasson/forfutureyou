import confetti from "canvas-confetti";

export function firePBConfetti() {
  const isDark = document.documentElement.classList.contains("dark");
  const defaults = {
    particleCount: 40,
    spread: 55,
    colors: [isDark ? "#ffffff" : "#000000"],
    ticks: 100,
    gravity: 1.2,
    scalar: 0.9,
  };

  // Left side
  confetti({ ...defaults, angle: 60, origin: { x: 0, y: 0.6 } });
  // Right side
  confetti({ ...defaults, angle: 120, origin: { x: 1, y: 0.6 } });
}
