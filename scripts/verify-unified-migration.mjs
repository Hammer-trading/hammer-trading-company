import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

try {
  const [
    legacyPackages,
    mappedPackages,
    legacyRequests,
    mappedBookings,
    serviceBookingItems,
    quoteItems,
    notificationJobs,
    projectMediaWithAssets,
    variantWholesalePrices
  ] = await Promise.all([
    prisma.roomPackage.count(),
    prisma.productPackage.count({ where: { legacyRoomPackageId: { not: null } } }),
    prisma.roomServiceRequest.count(),
    prisma.serviceBooking.count({ where: { legacyRoomServiceRequestId: { not: null } } }),
    prisma.serviceBookingItem.count(),
    prisma.quoteRequestItem.count(),
    prisma.outboundNotificationJob.count(),
    prisma.projectMedia.count({ where: { mediaAssetId: { not: null } } }),
    prisma.productVariant.count({ where: { wholesalePrice: { not: null } } })
  ]);
  const [duplicatePackageLinks, duplicateRequestLinks, duplicateServiceOrders] = await Promise.all([
    prisma.productPackage.groupBy({
      by: ["legacyRoomPackageId"],
      where: { legacyRoomPackageId: { not: null } },
      _count: { _all: true },
      having: { legacyRoomPackageId: { _count: { gt: 1 } } }
    }),
    prisma.serviceBooking.groupBy({
      by: ["legacyRoomServiceRequestId"],
      where: { legacyRoomServiceRequestId: { not: null } },
      _count: { _all: true },
      having: { legacyRoomServiceRequestId: { _count: { gt: 1 } } }
    }),
    prisma.serviceBooking.groupBy({
      by: ["convertedOrderId"],
      where: { convertedOrderId: { not: null } },
      _count: { _all: true },
      having: { convertedOrderId: { _count: { gt: 1 } } }
    })
  ]);

  const result = {
    ok: duplicatePackageLinks.length === 0 && duplicateRequestLinks.length === 0 && duplicateServiceOrders.length === 0,
    counts: {
      legacyPackages,
      mappedPackages,
      legacyRequests,
      mappedBookings,
      serviceBookingItems,
      quoteItems,
      notificationJobs,
      projectMediaWithAssets,
      variantWholesalePrices
    },
    duplicates: {
      packageLinks: duplicatePackageLinks.length,
      requestLinks: duplicateRequestLinks.length,
      convertedServiceOrders: duplicateServiceOrders.length
    }
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
