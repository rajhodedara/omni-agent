"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

/**
 * ThemeProvider — Client component that applies the theme
 * to the document element based on Zustand store state.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return <>{children}</>;
}
