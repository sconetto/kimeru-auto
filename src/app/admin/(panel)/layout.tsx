import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden p-6 lg:p-8">{children}</main>
    </div>
  );
}
