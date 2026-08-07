import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { tryDatabaseRead } from "@/lib/db-fallback";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requirePermission(Permission.DASHBOARD_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const startedAt = Date.now();
  try {
    const dbNowRows = await prisma.$queryRawUnsafe<Array<{ now: Date }>>("select now() as now");
    const [productCount, orderCount] = await Promise.all([
      prisma.product.count(),
      prisma.order.count()
    ]);
    const [migrationTableRows, variantTableRows, orderVariantColumnRows] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ exists: boolean }>>("select to_regclass('public._prisma_migrations') is not null as exists"),
      prisma.$queryRawUnsafe<Array<{ exists: boolean }>>("select to_regclass('public.\"ProductVariant\"') is not null as exists"),
      prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        "select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'OrderItem' and column_name = 'variantId') as exists"
      )
    ]);
    const migrationRows = migrationTableRows[0]?.exists
      ? await tryDatabaseRead(() => prisma.$queryRawUnsafe<Array<{ migration_name: string; finished_at: Date | null }>>(
        "select migration_name, finished_at from _prisma_migrations order by started_at desc limit 5"
      ), 5_000, 1) || []
      : [];

    return NextResponse.json({
      ok: true,
      source: "database",
      latencyMs: Date.now() - startedAt,
      serverTime: dbNowRows[0]?.now ?? null,
      products: productCount,
      orders: orderCount,
      schema: {
        prismaMigrationsTable: Boolean(migrationTableRows[0]?.exists),
        productVariantsTable: Boolean(variantTableRows[0]?.exists),
        orderItemVariantColumn: Boolean(orderVariantColumnRows[0]?.exists)
      },
      recentMigrations: migrationRows
    });
  } catch (error) {
    console.error("Database health check failed", error);
    return NextResponse.json(
      {
        ok: false,
        source: "database",
        latencyMs: Date.now() - startedAt,
        error: "Database connection failed"
      },
      { status: 503 }
    );
  }
}
