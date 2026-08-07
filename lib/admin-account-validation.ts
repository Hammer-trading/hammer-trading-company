import { z } from "zod";

const profileImagePattern = /^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/i;

export const adminProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  profileImage: z.string().max(1_050_000).refine((value) => !value || profileImagePattern.test(value), "Use an HTTPS image URL or a JPG, PNG, or WebP image").nullable().optional()
});

export const adminPasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string()
    .min(12, "Use at least 12 characters")
    .max(128)
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/[0-9]/, "Add a number")
    .regex(/[^A-Za-z0-9]/, "Add a symbol"),
  confirmPassword: z.string().min(1).max(128)
}).refine((value) => value.newPassword === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
  .refine((value) => value.currentPassword !== value.newPassword, { path: ["newPassword"], message: "New password must be different" });

export const adminEmailChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newEmail: z.string().trim().toLowerCase().email().max(254)
});

