"use client";

import {
  BarChart3,
  BookOpen,
  Car,
  ClipboardList,
  FolderTree,
  Gauge,
  LayoutDashboard,
  ListTree,
  LogOut,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/brands", label: "Marcas", icon: FolderTree },
  { href: "/admin/cars", label: "Veículos", icon: Car },
  { href: "/admin/specs", label: "Categorias de espec.", icon: Gauge },
  { href: "/admin/editorial", label: "Conteúdo editorial", icon: BookOpen },
  { href: "/admin/imports", label: "Importar dados", icon: Upload },
  { href: "/admin/analytics", label: "Vendas (FENABRAVE)", icon: BarChart3 },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/types", label: "Tipos e grupos", icon: ListTree },
  { href: "/admin/audit", label: "Auditoria", icon: ClipboardList },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <Link href="/admin" className="text-lg font-bold text-white">
          Kimeru <span className="text-blue-500">Admin</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-blue-600/20 font-medium text-blue-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          title="Sair"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
