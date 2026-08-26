import type { Order } from "@growshop/shared";
import { ORDER_STATUS_LABELS } from "@/lib/orderLabels";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<Order["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-secondary/15 text-secondary",
  preparing: "bg-secondary/15 text-secondary",
  shipped: "bg-accent/20 text-accent-foreground",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

export function OrderStatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_TONE[status])}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
