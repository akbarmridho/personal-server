import { Moon, Sun } from "lucide-react";
import { useTheme } from "~/hooks/use-theme";
import { Button } from "./ui/button";

/**
 * Theme toggle button for switching between light and dark modes
 */
export function ThemeToggle() {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const toggleTheme = () => {
    // Simple toggle between light and dark (not using "system")
    setTheme(effectiveTheme === "light" ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${effectiveTheme === "light" ? "dark" : "light"} mode`}
      title={`Current theme: ${theme} (${effectiveTheme})`}
    >
      {effectiveTheme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}
