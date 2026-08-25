import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-start px-4 py-24">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Esta página todavía no existe</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Estamos construyendo el sitio de a poco. Volvé al inicio mientras tanto.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </section>
  );
}
