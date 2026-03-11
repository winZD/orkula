import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  farmName: z.string().min(1, "Farm name is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const numericField = z
  .union([z.number(), z.string().transform(Number)])
  .pipe(z.number());

export const groveSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().optional(),
  area: numericField.pipe(z.number().positive("Must be positive")).optional(),
  treeCount: numericField
    .pipe(z.number().int().positive("Must be positive"))
    .optional(),
});

export const harvestSchema = z.object({
  groveId: z.string().min(1, "Grove is required"),
  date: z.string().min(1, "Date is required"),
  quantityKg: numericField.pipe(z.number().positive("Must be positive")),
  oilYieldLt: numericField
    .pipe(z.number().positive("Must be positive"))
    .optional(),
  oilYieldPct: numericField.pipe(z.number().min(0).max(100)).optional(),
  method: z.enum(["HAND", "RAKE", "MECHANICAL_SHAKER", "VIBRATOR", "NET"]),
  notes: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type GroveInput = z.infer<typeof groveSchema>;
export type HarvestInput = z.infer<typeof harvestSchema>;
