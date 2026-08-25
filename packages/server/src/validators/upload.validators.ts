import { z } from "zod";

export const uploadSignatureSchema = z.object({
  context: z.enum(["products", "receipts"]),
});

export type UploadContext = z.infer<typeof uploadSignatureSchema>["context"];
