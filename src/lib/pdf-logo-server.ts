import fs from "node:fs";
import path from "node:path";
import { LOGO_PUBLIC_FILENAME } from "@/lib/pdf-brand";

/**
 * Reads the logo from disk on the server (Node runtime only). Returns null if
 * the file hasn't been uploaded yet so callers can fall back to a text logo.
 * Server-only: never import this from a "use client" component.
 */
export function loadLogoDataUrlServer(): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", LOGO_PUBLIC_FILENAME);
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
