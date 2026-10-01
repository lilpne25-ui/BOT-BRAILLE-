"use client";

import {
  Bell,
  LogOut,
  Menu,
  Search,
  UserRound
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { AppRole, SessionUser } from "@/lib/auth/types";
import { getPublicBrand } from "@/lib/brand/public";

const roleLabels: Record<AppRole, string> = {
  ADMIN: "Administrador",
  SALES: "Ventas",
  OPERATIONS: "Operaciones"
};

export function Topbar({ session }: { session: SessionUser }) {
  const router = useRouter();
  const brand =
    getPublicBrand();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initials =
    session.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || "BI";

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/88 shadow-[0_8px_24px_-24px_hsl(var(--brand-ink)/0.5)] backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-7 xl:px-8 2xl:px-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              className="lg:hidden"
              variant="outline"
              size="icon"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Menú de navegación</SheetTitle>
              <SheetDescription>Módulos autorizados del CRM</SheetDescription>
            </SheetHeader>
            <div className="relative h-full">
              <AppSidebar mobile session={session} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="hidden items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-ink sm:flex md:hidden">
          <span className="h-2 w-2 rounded-full bg-brand-accent" />
          {brand.shortName}
        </div>

        <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/80 bg-white/95 px-3 shadow-[0_1px_2px_hsl(var(--brand-ink)/0.04)] md:flex">
          <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Buscar en el CRM"
            className="border-0 shadow-none focus-visible:ring-0"
            placeholder="Buscar cliente, proyecto o garantía..."
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 gap-2 rounded-xl"
                aria-label="Abrir menú de usuario"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                  aria-hidden="true"
                >
                  {initials}
                </span>
                <span className="hidden sm:block">{session.name}</span>
                <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div>
                  <p>{session.name}</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {roleLabels[session.role]} · {session.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void logout()}>
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
