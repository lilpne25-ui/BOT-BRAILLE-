import { cookies } from "next/headers";
import { SESSION_MAX_AGE_SECONDS, signSessionToken, verifySessionToken } from "@/lib/auth/token";
import { AppRole, PermissionKey, SessionUser } from "@/lib/auth/types";

export const AUTH_COOKIE_NAME = "braille_crm_session";

function getSecret() {
  return process.env.AUTH_SECRET?.trim() ?? "";
}

export function getCurrentSession(): SessionUser | null {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token, getSecret());
}

export function setSessionCookie(user: {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  permissions: PermissionKey[];
}) {
  const token = signSessionToken(user, getSecret());

  cookies().set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.AUTH_SECURE_COOKIE === "1",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export function clearSessionCookie() {
  cookies().set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.AUTH_SECURE_COOKIE === "1",
    path: "/",
    maxAge: 0
  });
}
