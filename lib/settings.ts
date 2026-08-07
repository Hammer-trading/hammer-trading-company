import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const loadSettings = unstable_cache(async (keys: string[]) => {
  try {
    const rows = await prisma.systemSetting.findMany({ where: { key: { in: keys } } });
    return Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<string, string>;
  } catch {
    return {} as Record<string, string>;
  }
}, ["system-settings"], { revalidate: 300, tags: ["system-settings"] });

export async function getSettings(keys: string[]) {
  return loadSettings(Array.from(new Set(keys)).sort());
}

export function settingValue(settings: Record<string, string>, key: string, fallback: string) {
  return settings[key]?.trim() || fallback;
}
