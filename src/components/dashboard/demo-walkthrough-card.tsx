import Link from "next/link";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const steps = [
  {
    id: 1,
    title: "Revisar dashboard ejecutivo",
    description: "Abre con KPIs y alertas para mostrar impacto operativo.",
    href: "/",
    state: "actual" as const
  },
  {
    id: 2,
    title: "Abrir prospecto Plaza Norte Queretaro",
    description: "Muestra dolor, historial y siguiente accion comercial.",
    href: "/prospectos",
    state: "pendiente" as const
  },
  {
    id: 3,
    title: "Crear cotizacion de piso podotactil",
    description: "Usa el wizard, agrega items y presenta total + IVA.",
    href: "/cotizador",
    state: "pendiente" as const
  },
  {
    id: 4,
    title: "Convertir a proyecto e instalacion",
    description: "Explica pipeline operativo con vista tabla, kanban y calendario.",
    href: "/proyectos",
    state: "pendiente" as const
  },
  {
    id: 5,
    title: "Cerrar con garantia y mantenimiento",
    description: "Valida seguimiento postventa con alertas y evidencia.",
    href: "/garantias",
    state: "pendiente" as const
  }
];

function StepStateIcon({ state }: { state: "pendiente" | "actual" | "completado" }) {
  if (state === "completado") return <CheckCircle2 className="h-5 w-5 text-[#2a8026]" aria-hidden="true" />;
  if (state === "actual") return <PlayCircle className="h-5 w-5 text-primary" aria-hidden="true" />;
  return <Circle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
}

function StepStateBadge({ state }: { state: "pendiente" | "actual" | "completado" }) {
  if (state === "completado") return <Badge variant="success">Completado</Badge>;
  if (state === "actual") return <Badge>Actual</Badge>;
  return <Badge variant="secondary">Pendiente</Badge>;
}

export function DemoWalkthroughCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recorrido recomendado de demo</CardTitle>
        <CardDescription>Guion visual de 5 a 7 minutos para presentar valor comercial real.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div key={step.id} className="rounded-2xl border bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StepStateIcon state={step.state} />
                  <p className="font-semibold text-brand-ink">{step.id}. {step.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <StepStateBadge state={step.state} />
                <Button asChild size="sm" variant="outline">
                  <Link href={step.href}>Ir al modulo</Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
