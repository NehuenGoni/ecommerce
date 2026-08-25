import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
