import type { SupplierInvoiceImportStatus } from "@growshop/shared";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground",
      processing: "bg-warning/15 text-warning",
      success: "bg-success/15 text-success",
      danger: "bg-destructive/15 text-destructive",
    },
  },
  defaultVariants: { tone: "neutral" },
});

const STATUS_CONFIG: Record<SupplierInvoiceImportStatus, { label: string; tone: "neutral" | "processing" | "success" | "danger" }> = {
  uploaded: { label: "Subida", tone: "processing" },
  extracting: { label: "Extrayendo con IA", tone: "processing" },
  review: { label: "Para revisar", tone: "neutral" },
  applying: { label: "Aplicando", tone: "processing" },
  applied: { label: "Aplicada", tone: "success" },
  failed: { label: "Falló", tone: "danger" },
  discarded: { label: "Descartada", tone: "neutral" },
};

export function InvoiceImportStatusBadge({
  status,
  className,
}: {
  status: SupplierInvoiceImportStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return <span className={cn(badgeVariants({ tone: config.tone }), className)}>{config.label}</span>;
}
