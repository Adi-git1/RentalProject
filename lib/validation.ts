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

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  phone: z.string().max(40).optional().or(z.literal("")),
});
