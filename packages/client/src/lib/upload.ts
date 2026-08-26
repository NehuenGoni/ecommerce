import { apiFetch } from "@/lib/api";

interface CloudinarySignature {
  signature: string;
  timestamp: number;
  folder: string;
  apiKey: string;
  cloudName: string;
}

export type UploadContext = "products" | "receipts";

/**
 * Sube una imagen directo a Cloudinary (subida firmada, sin pasar por
 * nuestro servidor) y devuelve la URL pública resultante. "products" solo
 * lo puede usar un admin (lo valida el propio endpoint de la firma).
 */
export async function uploadImage(
  file: File,
  accessToken: string,
  context: UploadContext,
): Promise<string> {
  const sig = await apiFetch<CloudinarySignature>("/uploads/cloudinary-signature", {
    method: "POST",
    accessToken,
    body: JSON.stringify({ context }),
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
    throw new Error("No pudimos subir la imagen. Probá de nuevo.");
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
