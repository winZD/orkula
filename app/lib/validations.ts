import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("validationInvalidEmail"),
  password: z.string().min(6, "validationPasswordMin"),
});

export const signupSchema = z.object({
  farmName: z.string().min(1, "validationFarmNameRequired"),
  firstName: z.string().min(1, "validationFirstNameRequired"),
  lastName: z.string().min(1, "validationLastNameRequired"),
  email: z.email("validationInvalidEmail"),
  password: z.string().min(6, "validationPasswordMin"),
});

const numericField = z
  .union([z.number(), z.string().transform(Number)])
  .pipe(z.number());

export const groveSchema = z.object({
  name: z.string().min(1, "validationNameRequired"),
  location: z.string().optional(),
  area: numericField
    .pipe(z.number().positive("validationMustBePositive"))
    .optional(),
  treeCount: numericField
    .pipe(z.number().int().positive("validationMustBePositive"))
    .optional(),
});

export const harvestSchema = z.object({
  groveId: z.string().min(1, "validationGroveRequired"),
  date: z.string().min(1, "validationDateRequired"),
  quantityKg: numericField.pipe(
    z.number().positive("validationMustBePositive"),
  ),
  oilYieldLt: numericField
    .pipe(z.number().positive("validationMustBePositive"))
    .optional(),
  oilYieldPct: numericField.pipe(z.number().min(0).max(100)).optional(),
  method: z.enum(["HAND", "RAKE", "MECHANICAL_SHAKER", "VIBRATOR", "NET"]),
  notes: z.string().optional(),
});

export const addUserSchema = z.object({
  firstName: z.string().min(1, "validationFirstNameRequired"),
  lastName: z.string().min(1, "validationLastNameRequired"),
  email: z.email("validationInvalidEmail"),
  password: z.string().min(6, "validationPasswordMin"),
  role: z.enum(["ADMIN", "MEMBER"], { message: "validationInvalidRole" }),
});

export const editUserSchema = z.object({
  firstName: z.string().min(1, "validationFirstNameRequired"),
  lastName: z.string().min(1, "validationLastNameRequired"),
  email: z.email("validationInvalidEmail"),
  password: z.string().min(6, "validationPasswordMin").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MEMBER"], { message: "validationInvalidRole" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type GroveInput = z.infer<typeof groveSchema>;
export type HarvestInput = z.infer<typeof harvestSchema>;
export type AddUserInput = z.infer<typeof addUserSchema>;
export type EditUserInput = z.infer<typeof editUserSchema>;
