import { z } from "zod";
export const emailSchema = z
  .email("Geçerli bir e-posta adresi girin.")
  .max(254);
export const passwordSchema = z
  .string()
  .min(8, "En az 8 karakter kullanın.")
  .max(128);
export const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1, "Adınızı girin.").max(150).optional(),
});
export type AuthInput = z.infer<typeof authSchema>;
export type AuthState = { error?: string; success?: string };
