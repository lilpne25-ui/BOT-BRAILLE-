import { NextRequest, NextResponse } from "next/server";
import {
  canAccessApi,
  canAccessUi,
  normalizeRole,
  resolvePermissions
} from "./src/lib/auth/permissions";

const COOKIE_NAME = "braille_crm_session";

type EdgeSession = {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: unknown;
  issuedAt: number;
  expiresAt: number;
};

function base64UrlToBytes(value: string) {
  let base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64UrlToText(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function readSession(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const secret = process.env.AUTH_SECRET?.trim();

    if (!token || !secret || secret.length < 32) return null;

    const [payloadPart, signaturePart] = token.split(".");
    if (!payloadPart || !signaturePart) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signaturePart),
      new TextEncoder().encode(payloadPart)
    );

    if (!valid) return null;

    const payload = JSON.parse(base64UrlToText(payloadPart)) as EdgeSession;
    const role = normalizeRole(payload.role);

    if (!role || payload.expiresAt <= Math.floor(Date.now() / 1000)) return null;

    return {
      ...payload,
      role,
      permissions: resolvePermissions(role, payload.permissions)
    };
  } catch {
    return null;
  }
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/whatsapp/webhook" ||
    pathname === "/api/integrations/web/leads"
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = await readSession(request);

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublicPath(pathname)) return NextResponse.next();

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesion requerida." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/api/")) {
    return canAccessApi(session.permissions, pathname, request.method)
      ? NextResponse.next()
      : NextResponse.json(
          { error: "No tienes permisos para esta accion." },
          { status: 403 }
        );
  }

  if (!canAccessUi(session.permissions, pathname)) {
    return NextResponse.redirect(new URL("/acceso-denegado", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
