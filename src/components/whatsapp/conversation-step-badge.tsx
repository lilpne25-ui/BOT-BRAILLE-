import { conversationSteps } from "@/modules/whatsapp/options";
import { ConversationSession } from "@/types/conversation";
import { Badge } from "@/components/ui/badge";

export function ConversationStepBadge({ session }: { session: ConversationSession }) {
  if (session.status === "idle") {
    return <Badge variant="secondary">Esperando intencion</Badge>;
  }

  if (session.status === "completed") {
    return <Badge variant="success">Flujo completado</Badge>;
  }

  const step = conversationSteps[session.currentStepIndex];
  const current = session.currentStepIndex + 1;
  const total = conversationSteps.length;

  return (
    <Badge variant="default" className="bg-brand-blue text-white">
      Paso {current}/{total}: {step?.label ?? "Captura"}
    </Badge>
  );
}
