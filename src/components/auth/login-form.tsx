"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPublicBrand } from "@/lib/brand/public";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const brand =
    getPublicBrand();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo iniciar sesión.");
      }

      router.replace(nextPath && nextPath.startsWith("/") ? nextPath : "/");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-[480px] border-border/80 bg-white/95 shadow-[0_30px_80px_-42px_hsl(var(--brand-ink)/0.62)] backdrop-blur-xl">
      <CardHeader className="text-center">
        {brand.logoPath ? (
          <Image
            src={brand.logoPath}
            alt={brand.name}
            width={340}
            height={230}
            className="mx-auto mb-2 h-auto w-64 object-contain"
            priority
          />
        ) : (
          <div
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground"
            aria-hidden="true"
          >
            {brand.monogram}
          </div>
        )}

        <CardTitle className="text-2xl text-brand-ink">
          {brand.crmName}
        </CardTitle>

        <CardDescription>
          Acceso al sistema interno de gestión comercial y operativa.
        </CardDescription>

        <div
          className="mx-auto mt-3 h-1 w-20 rounded-full brand-accent-line"
          aria-hidden="true"
        />
      </CardHeader>

      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <Label htmlFor="login-email">Correo</Label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border bg-white px-3 transition-[border-color,box-shadow] duration-150 focus-within:border-primary/55 focus-within:ring-4 focus-within:ring-primary/10">
              <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                className="border-0 px-0 shadow-none focus-visible:ring-0"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="login-password">Contraseña</Label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border bg-white px-3 transition-[border-color,box-shadow] duration-150 focus-within:border-primary/55 focus-within:ring-4 focus-within:ring-primary/10">
              <LockKeyhole
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="border-0 px-0 shadow-none focus-visible:ring-0"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <div className="ui-danger rounded-xl p-3 text-sm" role="alert" aria-live="polite">
              {error}
            </div>
          ) : null}

          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {busy ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          El acceso se limita a usuarios autorizados de{" "}
          <span className="font-semibold text-brand-ink">{brand.name}</span>.
        </p>
      </CardContent>
    </Card>
  );
}
