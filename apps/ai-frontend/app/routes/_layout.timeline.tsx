import { Link, Outlet, useLocation } from "react-router";
import { ThemeToggle } from "~/components/theme-toggle";

/**
 * Shared layout for timeline pages
 */
export default function TimelineLayout() {
  const location = useLocation();

  const isTickerActive = location.pathname.includes("/timeline/ticker");
  const isGeneralActive = location.pathname.includes("/timeline/general");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-4xl">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Title */}
            <div>
              <h1 className="text-xl font-bold">Investment Timeline</h1>
              <p className="text-sm text-muted-foreground">
                Browse investment documents
              </p>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>

          {/* Navigation Tabs */}
          <nav className="flex px-4 sm:px-6 lg:px-8">
            <Link
              to="/timeline/ticker"
              className={`px-4 py-2 text-sm font-medium transition-colors hover:text-foreground ${
                isTickerActive
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Ticker Timeline
            </Link>
            <Link
              to="/timeline/general"
              className={`px-4 py-2 text-sm font-medium transition-colors hover:text-foreground ${
                isGeneralActive
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              General Timeline
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
