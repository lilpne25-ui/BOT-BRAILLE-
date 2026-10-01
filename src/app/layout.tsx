import type {
  Metadata
} from "next";
import "./globals.css";
import {
  AppSidebar
} from "@/components/layout/app-sidebar";
import {
  MobileNav
} from "@/components/layout/mobile-nav";
import {
  Topbar
} from "@/components/layout/topbar";
import {
  getCurrentSession
} from "@/lib/auth/session";
import {
  getServerBrand
} from "@/lib/brand/server";

const metadataBrand =
  getServerBrand();

export const metadata: Metadata = {
  title:
    metadataBrand.crmName,
  description:
    metadataBrand.description,
  icons: {
    icon:
      metadataBrand.markPath ??
      "/favicon.ico"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  const session =
    getCurrentSession();
  const brand =
    getServerBrand();

  return (
    <html
      lang="es-MX"
      data-brand={
        brand.themeKey
      }
    >
      <body>
        {session ? (
          <>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
            >
              Saltar al contenido principal
            </a>

            <AppSidebar
              session={
                session
              }
            />

            <div className="min-h-screen lg:pl-64">
              <Topbar
                session={
                  session
                }
              />

              <main
                id="main-content"
                className="mx-auto w-full max-w-[1680px] px-4 pb-32 pt-5 sm:px-6 lg:px-7 lg:pb-12 xl:px-8 2xl:px-10"
              >
                {
                  children
                }
              </main>
            </div>

            <MobileNav
              session={
                session
              }
            />
          </>
        ) : (
          <main>
            {children}
          </main>
        )}
      </body>
    </html>
  );
}
