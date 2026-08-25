import type { ProductVariant } from "@growshop/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { buildAnonymousCartView, readLocalCartRecords, writeLocalCartRecords } from "@/lib/cartStorage";
import type { CartLineView } from "@/types/cart";
import type { ProductListItem } from "@/types/catalog";

interface CartApiResponse {
  items: CartLineView[];
  subtotal: number;
}

interface CartContextValue {
  items: CartLineView[];
  loading: boolean;
  subtotal: number;
  itemCount: number;
  addItem: (product: ProductListItem, variant: ProductVariant, quantity: number) => Promise<void>;
  setQuantity: (productId: string, variantSku: string, quantity: number) => Promise<void>;
  removeItem: (productId: string, variantSku: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

/** `null` representa "anónimo": un ID de usuario real nunca es null. */
type OwnerId = string | null;

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const ownerId: OwnerId = user?._id ?? null;

  const [items, setItems] = useState<CartLineView[]>([]);
  const [fetching, setFetching] = useState(true);
  const lastSyncedUserId = useRef<string | null>(null);
  // A qué usuario (o null = anónimo) pertenecen los `items` actualmente
  // cargados. `undefined` = todavía no cargamos nada.
  const loadedForOwner = useRef<OwnerId | undefined>(undefined);

  // `loading` se deriva en el render, no solo se setea desde el efecto: justo
  // después de loguearse, React puede commitear un render con `ownerId` ya
  // actualizado pero el efecto que dispara el refetch del carrito todavía no
  // corrió (los efectos corren después del commit). Sin esta derivación
  // síncrona, ese frame se ve como "no está cargando y no hay items" — un
  // consumer (ej. el guard de checkout) puede reaccionar mal a un estado que
  // en realidad es transitorio, no solo en tests: es observable en el navegador.
  const loading = fetching || loadedForOwner.current !== ownerId;

  const refresh = useCallback(async () => {
    setFetching(true);
    try {
      if (user && accessToken) {
        const data = await apiFetch<CartApiResponse>("/cart", { accessToken });
        setItems(data.items);
      } else {
        const views = await buildAnonymousCartView(readLocalCartRecords());
        setItems(views);
      }
    } finally {
      loadedForOwner.current = ownerId;
      setFetching(false);
    }
  }, [user, accessToken, ownerId]);

  // Al pasar de anónimo a logueado, sincronizamos el carrito de localStorage
  // con el backend una única vez (por sesión), como pide el brief.
  useEffect(() => {
    async function run() {
      if (user && accessToken && lastSyncedUserId.current !== user._id) {
        lastSyncedUserId.current = user._id;
        const records = readLocalCartRecords();
        if (records.length > 0) {
          try {
            setFetching(true);
            const data = await apiFetch<CartApiResponse>("/cart", {
              method: "PUT",
              accessToken,
              body: JSON.stringify({ items: records }),
            });
            setItems(data.items);
            writeLocalCartRecords([]); // el backend ya es la fuente de verdad
            loadedForOwner.current = ownerId;
            setFetching(false);
            return;
          } catch {
            // si la sincronización falla, seguimos con un refresh normal
          }
        }
      }
      await refresh();
    }
    void run();
  }, [user, accessToken, ownerId, refresh]);

  const setQuantity = useCallback(
    async (productId: string, variantSku: string, quantity: number) => {
      if (user && accessToken) {
        const data = await apiFetch<CartApiResponse>("/cart/items", {
          method: "PATCH",
          accessToken,
          body: JSON.stringify({ productId, variantSku, quantity }),
        });
        setItems(data.items);
        return;
      }

      const records = readLocalCartRecords();
      const index = records.findIndex((r) => r.productId === productId && r.variantSku === variantSku);
      if (quantity <= 0) {
        if (index >= 0) records.splice(index, 1);
      } else if (index >= 0) {
        records[index]!.quantity = quantity;
      } else {
        records.push({ productId, variantSku, quantity });
      }
      writeLocalCartRecords(records);
      setItems(await buildAnonymousCartView(records));
    },
    [user, accessToken],
  );

  const addItem = useCallback(
    async (product: ProductListItem, variant: ProductVariant, quantity: number) => {
      const existing = items.find((i) => i.product.id === product._id && i.variant.sku === variant.sku);
      await setQuantity(product._id, variant.sku, (existing?.quantity ?? 0) + quantity);
    },
    [items, setQuantity],
  );

  const removeItem = useCallback(
    (productId: string, variantSku: string) => setQuantity(productId, variantSku, 0),
    [setQuantity],
  );

  const clearCart = useCallback(async () => {
    if (user && accessToken) {
      await apiFetch("/cart", { method: "DELETE", accessToken });
    } else {
      writeLocalCartRecords([]);
    }
    setItems([]);
  }, [user, accessToken]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, loading, subtotal, itemCount, addItem, setQuantity, removeItem, clearCart, refresh }),
    [items, loading, subtotal, itemCount, addItem, setQuantity, removeItem, clearCart, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart debe usarse dentro de <CartProvider>");
  }
  return ctx;
}
