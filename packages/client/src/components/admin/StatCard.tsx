import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  to?: string;
  tone?: "default" | "warning";
}

export function StatCard({ label, value, to, tone = "default" }: StatCardProps) {
  const content = (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 transition-colors",
        tone === "warning" && Number(value) > 0
          ? "border-warning/40 bg-warning/5"
          : "border-border",
        to && "hover:border-primary",
      )}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-3xl font-bold">{value}</p>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}
