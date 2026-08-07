import { AdminShell } from "@/components/admin-shell";
import { AdminPlatformManager, type AdminPlatformResource } from "@/components/admin-platform-manager";
import { RoomServiceManager } from "@/components/admin/room-service-manager";

export const dynamic = "force-dynamic";

export default async function AdminRoomServicesPage({ searchParams }: { searchParams: Promise<{ tab?: string; id?: string }> }) {
  const params = await searchParams;
  const initialResource: AdminPlatformResource = params.tab === "bookings" ? "bookings" : "services";
  return (
    <AdminShell>
      <div className="space-y-6">
        <AdminPlatformManager initialResource={initialResource} />
        <details className="admin-surface group p-5" open={Boolean(params.id)}>
          <summary className="cursor-pointer list-none font-black">
            Legacy room service requests
            <span className="ml-2 text-xs font-semibold text-slate-500">Older requests retained for backward compatibility</span>
          </summary>
          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-white/10">
            <RoomServiceManager />
          </div>
        </details>
      </div>
    </AdminShell>
  );
}
