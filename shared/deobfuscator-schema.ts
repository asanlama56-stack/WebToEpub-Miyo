import { z } from "zod";

export interface DeobfuscationJob {
  id: string;
  code: string;
  deobfuscatedCode?: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
  createdAt: number;
  completedAt?: number;
  geminiAnalysis?: string;
}

export const deobfuscateSchema = z.object({
  code: z.string().min(10, "Code must be at least 10 characters"),
});

export type DeobfuscateInput = z.infer<typeof deobfuscateSchema>;
