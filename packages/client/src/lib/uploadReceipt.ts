import { apiFetch } from "@/lib/api";

interface CloudinarySignature {
  signature: string;
  timestamp: number;
  folder: string;
  apiKey: string;
  cloudName: string;
}

/**
 * Sube el comprobante directo a Cloudinary (subida firmada, sin pasar por
 * nuestro servidor) y devuelve la URL pública resultante.
 */
export async function uploadReceiptImage(file: File, accessToken: string): Promise<string> {
  const sig = await apiFetch<CloudinarySignature>("/uploads/cloudinary-signature", {
    method: "POST",
    accessToken,
    body: JSON.stringify({ context: "receipts" }),
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  formData.append("folder", sig.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("No pudimos subir el comprobante. Probá de nuevo.");
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
