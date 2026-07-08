"use client";

import { useEffect, useState } from "react";
import { LuMoon as Moon, LuSun as Sun } from "react-icons/lu";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);

    // Block all transitions for one paint so the color swap is instant.
    const style = document.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(style);

    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("kwarta:color-mode", next ? "dark" : "light");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.head.removeChild(style));
    });
  }

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors md:hover:bg-[hsl(var(--hover-surface))] md:hover:text-foreground"
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
