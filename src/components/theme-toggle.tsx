"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Both icons render; the active one is chosen purely in CSS via the dark
// variant, so there is no hydration-mismatch state dance.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle color theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun aria-hidden="true" className="hidden size-4.5 dark:block" />
      <Moon aria-hidden="true" className="size-4.5 dark:hidden" />
    </Button>
  );
}
