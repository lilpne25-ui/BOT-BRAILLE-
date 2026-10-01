import { z } from "zod";

export const nonEmptyTextSchema = z.string().trim().min(1);
export const optionalTextSchema = z.string().trim().optional();
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const percentageSchema = z.number().min(0).max(100);
export const positiveAmountSchema = z.number().nonnegative();
