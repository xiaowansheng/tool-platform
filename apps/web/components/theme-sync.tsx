"use client";

import { useLayoutEffect } from "react";

export function ThemeSync() {
  useLayoutEffect(() => {
    const stored = localStorage.getItem("theme");
    const theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  });

  return null;
}
