import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertLocalFallbackEnabled } from "@/lib/db-fallback";
import { categories as catalogCategories } from "@/lib/catalog";
import { slugify } from "@/lib/utils";
import type { categoryInputSchema } from "@/lib/admin-validation";
import type { z } from "zod";

type CategoryInput = z.infer<typeof categoryInputSchema>;

export type FallbackCategory = CategoryInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

const storePath = path.join(process.cwd(), "data", "fallback-categories.json");

function defaultCategories(): FallbackCategory[] {
  const now = new Date().toISOString();
  return catalogCategories.map((name, index) => ({
    id: slugify(name),
    name,
    slug: slugify(name),
    description: "",
    image: "",
    banner: "",
    parentId: null,
    seoTitle: name,
    seoDescription: `${name} products at Hammer Trading Company`,
    sortOrder: index + 1,
    isActive: true,
    createdAt: now,
    updatedAt: now
  }));
}

async function ensureStore() {
  await mkdir(path.dirname(storePath), { recursive: true });
}

async function writeFallbackCategories(categories: FallbackCategory[]) {
  await ensureStore();
  await writeFile(storePath, JSON.stringify(categories, null, 2), "utf8");
}

export async function readFallbackCategories() {
  assertLocalFallbackEnabled();
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FallbackCategory[]) : defaultCategories();
  } catch {
    return defaultCategories();
  }
}

export async function readFallbackCategoryLookups() {
  const categories = await readFallbackCategories();
  return categories
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((category) => ({ id: category.id, name: category.name, slug: category.slug }));
}

export async function saveFallbackCategory(input: CategoryInput, id?: string) {
  const categories = await readFallbackCategories();
  const now = new Date().toISOString();
  const nextId = id || `fallback-category-${slugify(input.slug || input.name)}-${Date.now()}`;
  const existing = categories.find((category) => category.id === nextId);
  const category: FallbackCategory = {
    ...input,
    id: nextId,
    description: input.description || "",
    image: input.image || "",
    banner: input.banner || "",
    parentId: input.parentId || null,
    seoTitle: input.seoTitle || "",
    seoDescription: input.seoDescription || "",
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  await writeFallbackCategories([category, ...categories.filter((item) => item.id !== nextId)]);
  return category;
}

export async function deleteFallbackCategory(id: string) {
  const categories = await readFallbackCategories();
  const next = categories.filter((category) => category.id !== id);
  await writeFallbackCategories(next);
  return next.length !== categories.length;
}
