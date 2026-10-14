import { Product as PrismaProduct } from "@prisma/client";
import { parseJsonArray } from "./admin";
import { Product } from "./types";

export function serializeProduct(p: PrismaProduct): Product {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    features: parseJsonArray(p.features),
    images: parseJsonArray(p.images),
    video: p.video,
    unit: p.unit,
    minOrder: p.minOrder,
    priceMin: p.priceMin ?? null,
    priceMax: p.priceMax ?? null,
    featured: p.featured,
    active: p.active,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeModel<T extends Record<string, unknown>>(
  item: T & { createdAt: Date; updatedAt?: Date }
) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt ? item.updatedAt.toISOString() : undefined,
  };
}
