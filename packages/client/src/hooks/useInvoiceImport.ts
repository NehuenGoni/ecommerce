import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { getImport, type ImportDetail } from "@/lib/invoiceImports";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Trae una importación y, mientras su estado sea "uploaded" o "extracting"
 * (la extracción por IA corre en segundo plano en el server), sigue
 * consultando cada 3s hasta que salga de esos estados o pasen 3 minutos.
 *
 * El intervalo se arma una sola vez por id (no en cada refresh): reiniciarlo
 * en cada respuesta correría de nuevo el conteo de los 3 minutos y el corte
 * por timeout nunca llegaría a dispararse. Por eso el estado más reciente se
 * lee de un ref dentro del tick, en vez de depender de `data` directamente.
 */
export function useInvoiceImport(id: string | undefined) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<ImportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<ImportDetail | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const res = await getImport(id, accessToken);
      dataRef.current = res;
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cargar la importación.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!accessToken || !id) return;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const status = dataRef.current?.import.status;
      const stillProcessing = status === "uploaded" || status === "extracting";
      if (!stillProcessing || Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(interval);
        return;
      }
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [accessToken, id, refresh]);

  return { data, loading, error, refresh };
}
