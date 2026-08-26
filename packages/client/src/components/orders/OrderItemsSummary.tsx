import { formatARS, type Order } from "@growshop/shared";

type OrderSummary = Pick<Order, "orderNumber" | "items" | "subtotal" | "shippingCost" | "total">;

export function OrderItemsSummary({ order }: { order: OrderSummary }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-muted-foreground">{order.orderNumber}</span>
      </div>

      <ul className="mt-3 flex flex-col gap-2 border-t border-border pt-4 text-sm">
        {order.items.map((item) => (
          <li key={item.variant.sku} className="flex justify-between gap-2">
            <span className="text-muted-foreground">
              {item.quantity}x {item.variant.name}
            </span>
            <span className="font-mono">{formatARS(item.subtotal)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-mono">{formatARS(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Envío</span>
          <span className="font-mono">{formatARS(order.shippingCost)}</span>
        </div>
      </div>

      <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-bold">
        <span>Total</span>
        <span className="font-mono">{formatARS(order.total)}</span>
      </div>
    </div>
  );
}
