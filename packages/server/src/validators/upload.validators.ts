import { z } from "zod";

export const uploadSignatureSchema = z.object({
  context: z.enum(["products", "receipts", "categories"]),
});

export type UploadContext = z.infer<typeof uploadSignatureSchema>["context"];
