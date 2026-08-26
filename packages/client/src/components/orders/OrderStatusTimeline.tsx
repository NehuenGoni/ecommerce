import type { OrderStatusHistoryEntry } from "@growshop/shared";
import { ORDER_STATUS_LABELS } from "@/lib/orderLabels";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderStatusTimeline({ history }: { history: OrderStatusHistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold">Historial</h2>
      <ol className="mt-4 flex flex-col">
        {history.map((entry, index) => (
          <li key={`${entry.status}-${entry.timestamp}`} className="relative grid grid-cols-[1.1rem_1fr] gap-3 pb-5 last:pb-0">
            {index < history.length - 1 && (
              <span aria-hidden="true" className="absolute top-5 bottom-0 left-[0.5rem] w-px bg-border" />
            )}
            <span aria-hidden="true" className="relative z-10 mt-1 h-3 w-3 rounded-full bg-primary" />
            <div>
              <p className="font-semibold">{ORDER_STATUS_LABELS[entry.status]}</p>
              <p className="font-mono text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</p>
              {entry.note && <p className="mt-0.5 text-sm text-muted-foreground">{entry.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
