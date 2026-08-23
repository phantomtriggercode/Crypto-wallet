import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { AdminShell } from "@/components/admin/shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  if (!user) redirect("/login");

  const settings = await getSettings();

  return (
    <AdminShell
      settings={{ siteName: settings.siteName }}
      user={{ fullName: user.fullName, email: user.email, roles: user.adminRoles.map((r) => r.role) }}
    >
      {children}
    </AdminShell>
  );
}
