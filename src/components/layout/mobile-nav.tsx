"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  HandCoins,
  Home,
  ShieldCheck,
  UserCog,
  UsersRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PermissionKey, SessionUser } from "@/lib/auth/types";
import { hasPermission } from "@/lib/auth/permissions";

type MobileItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: PermissionKey;
};

const navigation: MobileItem[] = [
  { href: "/", label: "Inicio", icon: Home, permission: "dashboard.view" },
  { href: "/prospectos", label: "CRM", icon: UsersRound, permission: "leads.view" },
  { href: "/cotizador", label: "Cotizar", icon: HandCoins, permission: "quotes.view" },
  { href: "/proyectos", label: "Proyectos", icon: ClipboardCheck, permission: "projects.view" },
  { href: "/garantias", label: "Garantías", icon: ShieldCheck, permission: "warranties.view" },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, permission: "users.view" }
];

export function MobileNav({ session }: { session: SessionUser }) {
  const pathname = usePathname();
  const visible = navigation.filter((item) =>
    hasPermission(session.permissions, item.permission)
  );

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-2 py-2 shadow-2xl backdrop-blur lg:hidden"
      aria-label="Navegación móvil"
    >
      <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 min-w-[72px] flex-1 flex-col items-center justify-center rounded-2xl px-2 text-[10px] font-semibold text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
                active && "bg-primary text-primary-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="mb-1 h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
