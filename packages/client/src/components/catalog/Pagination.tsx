import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pages, onPageChange }: PaginationProps) {
  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </Button>
      <span className="font-mono text-sm text-muted-foreground">
        {page} / {pages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
      </Button>
    </div>
  );
}
