import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
