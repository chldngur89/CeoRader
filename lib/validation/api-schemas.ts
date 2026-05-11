import { z } from "zod";

const trackedCompanySchema = z
  .object({
    id: z.string().optional(),
    name: z.string(),
    website: z.string(),
  })
  .transform((o) => ({
    ...o,
    name: o.name.trim(),
    website: o.website.trim(),
  }));

export const analyzePostBodySchema = z.object({
  topic: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "topic required")),
  description: z.string().optional().default("").transform((s) => s.trim()),
  keywords: z
    .array(z.string())
    .optional()
    .default([])
    .transform((arr) => arr.map((s) => s.trim()).filter(Boolean)),
  companyName: z.string().optional().default("").transform((s) => s.trim()),
  companyWebsite: z.string().optional().default("").transform((s) => s.trim()),
  trackedCompanies: z.array(trackedCompanySchema).optional().default([]),
  sourceLimit: z.number().int().positive().optional(),
})
  .transform((d) => ({
    ...d,
    sourceLimit:
      d.sourceLimit === undefined ? undefined : Math.min(4, Math.max(1, Math.floor(d.sourceLimit))),
  }));

export const pricingLowestBodySchema = z
  .object({
    productName: z.string().optional(),
    productUrl: z.string().optional(),
    category: z.string().optional(),
  })
  .refine((b) => !!(b.productName?.trim() || b.productUrl?.trim() || b.category?.trim()), {
    message: "productName, productUrl, or category required",
  });

export type AnalyzePostBody = z.infer<typeof analyzePostBodySchema>;
export type PricingLowestBody = z.infer<typeof pricingLowestBodySchema>;
