const { z } = require("zod");

const userNameSchema = z
  .string()
  .trim()
  .min(3, "Full name must be at least 3 characters")
  .max(30, "Full name must be at most 30 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message:
      "Full name can only contain letters, numbers, underscores and hyphens",
  })
  .transform((val) => val.toLowerCase());

const registerSchema = z
  .object({
    userName: userNameSchema,
    email: z
      .string()
      .email("Invalid email")
      .transform((val) => val.toLowerCase().trim()),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const forgotSchema = z.object({
  email: z
    .string()
    .email()
    .transform((val) => val.toLowerCase().trim()),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const verifyTwoFactorSchema = z.object({
  email: z
    .string()
    .email("Invalid email")
    .transform((val) => val.toLowerCase().trim()),
  code: z.string().length(6, "Code must be 6 digits"),
});

const updateNotificationSchema = z.object({
  isLoginNotification: z.boolean(),
});

const updateNotificationsSchema = z.object({
  emailNotification: z.boolean().optional(),
  pushNotification: z.boolean().optional(),
  marketingNotification: z.boolean().optional(),
  weeklyNotification: z.boolean().optional(),
  securityNotification: z.boolean().optional(),
});

const updatePreferencesSchema = z.object({
  isVisible: z.boolean().optional(),
  theme: z.enum(["dark", "light"]).optional(),
  isPremium: z.boolean().optional(),
  accountStatus: z.enum(["active", "inactive", "pending", "deleted", "banned", "suspended"]).optional(),
  timezone: z.string().optional(),
});

const deleteAccountSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyTwoFactorSchema,
  updateNotificationSchema,
  updateNotificationsSchema,
  updatePreferencesSchema,
  deleteAccountSchema,
};
