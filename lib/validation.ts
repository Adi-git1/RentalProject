import { z } from "zod";

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

export const deliveryAddressSchema = z.object({
  line1: z.string().min(3, "Street address is required").max(200),
  line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(1, "City is required").max(120),
  state: z.string().min(2, "State is required").max(40),
  postal_code: z.string().min(3, "ZIP is required").max(12),
});

export const checkoutSchema = z
  .object({
    lines: z
      .array(
        z.object({
          itemId: z.string().uuid(),
          qty: z.number().int().min(1).max(500),
        }),
      )
      .min(1, "Your cart is empty."),
    startISO: isoDate,
    endISO: isoDate,
    fulfillment: z.enum(["pickup", "delivery"]),
    deliveryAddress: deliveryAddressSchema.optional(),
    termsAccepted: z.literal(true, {
      message: "You must accept the rental terms.",
    }),
  })
  .refine((v) => v.endISO >= v.startISO, {
    message: "End date must be on or after the start date.",
    path: ["endISO"],
  })
  .refine((v) => v.fulfillment === "pickup" || v.deliveryAddress, {
    message: "Enter a delivery address.",
    path: ["deliveryAddress"],
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const reviewSchema = z.object({
  itemId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional().or(z.literal("")),
});

const money = z.coerce.number().min(0).max(1_000_000);
const optionalMoney = z
  .union([z.literal(""), z.coerce.number().min(0).max(1_000_000)])
  .transform((v) => (v === "" ? null : v));

export const itemSchema = z.object({
  name: z.string().min(2).max(160),
  category: z.string().min(1).max(80),
  description: z.string().max(4000).optional().or(z.literal("")),
  dimensions: z.string().max(160).optional().or(z.literal("")),
  weight: z.string().max(80).optional().or(z.literal("")),
  price_day: money,
  price_weekend: optionalMoney,
  price_week: optionalMoney,
  deposit: money,
  quantity: z.coerce.number().int().min(0).max(100000),
  active: z.coerce.boolean(),
  specs: z.record(z.string(), z.string()).default({}),
});
export type ItemInput = z.infer<typeof itemSchema>;

export const blockedDateSchema = z
  .object({
    item_id: z.string().uuid(),
    start_date: isoDate,
    end_date: isoDate,
    reason: z.string().max(200).optional().or(z.literal("")),
  })
  .refine((v) => v.end_date >= v.start_date, {
    message: "End date must be on or after start date.",
    path: ["end_date"],
  });

export const settingsSchema = z.object({
  business_name: z.string().min(1).max(120),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().max(40).optional().or(z.literal("")),
  pickup_address: z.string().min(3).max(300),
  delivery_radius_miles: z.coerce.number().min(0).max(500),
  delivery_fee: money,
  free_delivery_threshold: money,
  min_rental_days: z.coerce.number().int().min(1).max(30),
  tax_rate: z.coerce.number().min(0).max(0.5),
  cancellation_policy: z.string().max(4000),
  late_fee_policy: z.string().max(4000),
  terms_text: z.string().max(8000),
  logo_url: z.string().url().optional().or(z.literal("")),
});

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  phone: z.string().max(40).optional().or(z.literal("")),
});
