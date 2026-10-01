import { Badge } from "@/components/ui/badge";
import { LeadStatus } from "@/modules/crm/contracts";

export function ProspectStatusBadge({
  status
}: {
  status: LeadStatus;
}) {
  const variant =
    status === "Ganado"
      ? "success"
      : status === "Perdido"
        ? "destructive"
        : status ===
            "Pendiente de revision humana"
          ? "warning"
          : status === "Negociacion"
            ? "warning"
            : status === "Cotizacion enviada"
              ? "default"
              : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}
