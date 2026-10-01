import { createHmac, timingSafeEqual } from "node:crypto";
import {
  AppRole,
  PermissionKey,
  SessionUser,
  isAppRole
} from "@/lib/auth/types";
import { resolvePermissions } from "@/lib/auth/permissions";

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

type TokenUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  permissions: PermissionKey[];
};

function signatureFor(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(first: string, second: string) {
  const a = Buffer.from(first);
  const b = Buffer.from(second);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signSessionToken(
  user: TokenUser,
  secret: string,
  nowMs = Date.now()
) {
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET debe tener al menos 32 caracteres.");
  }

  const issuedAt = Math.floor(nowMs / 1000);
  const expiresAt = issuedAt + SESSION_MAX_AGE_SECONDS;
  const payload: SessionUser = { ...user, issuedAt, expiresAt };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

  return `${encoded}.${signatureFor(encoded, secret)}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  nowMs = Date.now()
): SessionUser | null {
  try {
    if (secret.length < 32) return null;

    const [payloadPart, signature] = token.split(".");
    if (!payloadPart || !signature) return null;

    if (!safeEqual(signature, signatureFor(payloadPart, secret))) return null;

    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8")
    ) as Partial<SessionUser> & { permissions?: unknown };

    if (
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      !isAppRole(payload.role) ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    if (payload.expiresAt <= Math.floor(nowMs / 1000)) return null;

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      permissions: resolvePermissions(payload.role, payload.permissions),
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt
    };
  } catch {
    return null;
  }
}
