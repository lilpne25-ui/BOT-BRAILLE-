import { ChatWindow } from "@/components/whatsapp/chat-window";
import { PageShell } from "@/components/layout/page-shell";

export default function WhatsAppDemoPage() {
  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Demo conversacional</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-ink">WhatsApp demo para cotizacion</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Simulacion comercial sin API real: captura datos del cliente, genera folio preliminar y envia al CRM mock.
          </p>
        </div>
        <ChatWindow />
      </div>
    </PageShell>
  );
}
