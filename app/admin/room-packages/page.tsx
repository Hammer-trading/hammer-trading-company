import { AdminShell } from "@/components/admin-shell";
import { AdminPlatformManager } from "@/components/admin-platform-manager";
import { RoomPackageManager } from "@/components/admin/room-package-manager";

export const dynamic = "force-dynamic";

export default function AdminRoomPackagesPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <AdminPlatformManager initialResource="packages" />
        <details className="admin-surface group p-5">
          <summary className="cursor-pointer list-none font-black">
            Legacy room package archive
            <span className="ml-2 text-xs font-semibold text-slate-500">Old free-text packages and compatibility records</span>
          </summary>
          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-white/10">
            <RoomPackageManager />
          </div>
        </details>
      </div>
    </AdminShell>
  );
}
