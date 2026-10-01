import { conversationSteps } from "@/modules/whatsapp/options";
import { ConversationSession } from "@/types/conversation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

type PanelProps = {
  session: ConversationSession;
};

export function CapturedDataPanel({
  session
}: PanelProps) {
  const items = conversationSteps.map((step) => ({
    id: step.id,
    label: step.label,
    value: session.capturedData[step.id]
  }));
  const completed = session.status === "completed";

  return (
    <Card className="h-full border-brand-border">
      <CardHeader>
        <CardTitle className="text-base text-brand-ink">
          Datos capturados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl
          className="space-y-3"
          aria-live="polite"
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-brand-border bg-white p-3"
            >
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-1 text-sm text-brand-ink">
                {item.value || "Pendiente"}
              </dd>
            </div>
          ))}
        </dl>

        <div className="rounded-xl border border-brand-border bg-brand-background p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Resultado
          </p>
          <p className="mt-1 text-sm font-semibold text-brand-ink">
            {completed
              ? "Expediente listo para revisión humana"
              : "Captura en proceso"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cotización:{" "}
            {completed
              ? "pendiente de preparación por un ejecutivo"
              : "no disponible hasta completar y revisar el expediente"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
