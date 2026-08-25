import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold">Growshop</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-[28ch]">
            Insumos de cultivo para GBA Norte. Envío por moto o retiro en punto.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tienda</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/" className="hover:text-primary">
                Catálogo
              </Link>
            </li>
            <li>
              <Link to="/cuenta/pedidos" className="hover:text-primary">
                Seguimiento de pedido
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ayuda</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/envios" className="hover:text-primary">
                Envíos y retiro
              </Link>
            </li>
            <li>
              <Link to="/contacto" className="hover:text-primary">
                Contacto
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Growshop. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
