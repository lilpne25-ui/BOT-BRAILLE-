"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardCheck,
  Database,
  HandCoins,
  Home,
  MessageCircle,
  ShieldCheck,
  UserCog,
  UsersRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { PermissionKey, SessionUser } from "@/lib/auth/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getPublicBrand } from "@/lib/brand/public";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: PermissionKey;
};

const navigation: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home, permission: "dashboard.view" },
  { href: "/prospectos", label: "Prospectos", icon: UsersRound, permission: "leads.view" },
  { href: "/cotizador", label: "Cotizador", icon: HandCoins, permission: "quotes.view" },
  { href: "/catalogo", label: "Catálogo", icon: Database, permission: "catalog.view" },
  { href: "/proyectos", label: "Proyectos", icon: ClipboardCheck, permission: "projects.view" },
  { href: "/garantias", label: "Garantías", icon: ShieldCheck, permission: "warranties.view" },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, permission: "whatsapp.view" },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, permission: "users.view" }
];

export function AppSidebar({
  mobile = false,
  session
}: {
  mobile?: boolean;
  session: SessionUser;
}) {
  const pathname = usePathname();
  const brand =
    getPublicBrand();

  const visibleNavigation = navigation.filter((item) =>
    hasPermission(session.permissions, item.permission)
  );

  return (
    <aside
      className={cn(
        mobile
          ? "relative block h-full w-full border-r-0"
          : "fixed left-0 top-0 z-30 hidden h-screen w-64 border-r lg:block",
        "bg-white/95 p-4 shadow-[8px_0_30px_-28px_hsl(var(--brand-ink)/0.42)] backdrop-blur-xl"
      )}
    >
      <Link
        href="/"
        className="group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-primary/[0.035] focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Ir al dashboard"
      >
        <div
          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border"
          aria-hidden="true"
        >
          {brand.markPath ? (
            <Image
              src={brand.markPath}
              alt=""
              width={48}
              height={48}
              className="h-10 w-10 object-contain"
              priority
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-primary text-sm font-black text-primary-foreground">
              {brand.monogram}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black uppercase tracking-[0.15em] text-brand-ink">
            {brand.shortName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            CRM comercial y operativo
          </p>
        </div>
      </Link>

      <Separator className="my-5" />

      <nav className="space-y-1" aria-label="Navegación principal">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 overflow-hidden rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted-foreground transition-[color,background-color,transform,box-shadow] duration-150 hover:bg-primary/[0.055] hover:text-foreground motion-safe:hover:translate-x-0.5 focus-visible:ring-2 focus-visible:ring-ring",
                active &&
                  "ui-route-accent bg-primary text-primary-foreground shadow-[0_8px_20px_-14px_hsl(var(--primary)/0.9)] hover:bg-primary hover:text-primary-foreground motion-safe:hover:translate-x-0"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4 overflow-hidden rounded-2xl border bg-brand-background p-3.5 brand-pattern">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <BarChart3 className="h-4 w-4 text-brand-accent" aria-hidden="true" />
          Sesión protegida · {brand.shortName}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {session.name}
          <br />
          {session.permissions.length} permisos activos
        </p>
      </div>
    </aside>
  );
}
