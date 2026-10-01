import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <Card>
        <CardContent className="p-8 text-center">
          <ShieldX
            className="mx-auto h-12 w-12 text-muted-foreground"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-2xl font-bold text-brand-ink">
            Acceso restringido
          </h1>
          <p className="mt-2 text-muted-foreground">
            Tu rol no tiene permiso para abrir este módulo.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
