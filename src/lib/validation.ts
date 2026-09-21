import { z } from "zod";

export const registerSchema = z.object({
  restaurantName: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(72),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  sortOrder: z.number().int().min(0).max(100000).optional(),
});

export const optionChoiceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(60),
  priceDeltaCents: z.number().int().min(-1000000).max(1000000),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

export const optionGroupSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(60),
  required: z.boolean().optional(),
  multiSelect: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  choices: z.array(optionChoiceSchema).max(30),
});

export const menuItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  priceCents: z.number().int().min(0).max(100000000),
  imageUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  optionGroups: z.array(optionGroupSchema).max(20).optional(),
});

export const tableSchema = z.object({
  label: z.string().trim().min(1).max(40),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  currency: z.string().trim().length(3),
  taxRateBps: z.number().int().min(0).max(10000),
  logoUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "SERVED",
    "CANCELLED",
  ]),
});

export const createOrderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  selectedChoiceIds: z.array(z.string()).max(50).optional(),
});

export const createOrderSchema = z.object({
  restaurantSlug: z.string().trim().min(1),
  tableToken: z.string().trim().min(1).optional(),
  customerName: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(createOrderItemSchema).min(1).max(100),
});
