import { jsPDF } from "jspdf";
import { drawFooter, drawInfoGrid, drawLetterhead, drawTotalBox } from "@/lib/pdf-brand";
import { loadLogoDataUrlServer } from "@/lib/pdf-logo-server";

type BuildQuotePdfInput = {
  folio: string;
  generatedAtIso: string;
  client: string;
  contact: string;
  city: string;
  projectLocation: string;
  solutionType: string;
  material: string;
  usage: string;
  installationMethod: string;
  quantity: string;
  urgency: string;
  evidence: string;
  estimatedAmount: number;
};

export function buildPreliminaryQuotePdf(input: BuildQuotePdfInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const now = new Date(input.generatedAtIso);
  const dateLabel = Number.isNaN(now.getTime()) ? input.generatedAtIso : now.toLocaleString("es-MX");

  let y = drawLetterhead(doc, {
    logoDataUrl: loadLogoDataUrlServer(),
    subtitle: "Cotización preliminar",
    folio: input.folio,
    dateLabel
  });

  y = drawInfoGrid(doc, y, [
    { label: "Cliente", value: input.client },
    { label: "Contacto", value: input.contact },
    { label: "Ciudad", value: input.city },
    { label: "Ubicación del proyecto", value: input.projectLocation }
  ]);

  y = drawInfoGrid(doc, y, [
    { label: "Solución", value: input.solutionType },
    { label: "Material", value: input.material },
    { label: "Uso", value: input.usage },
    { label: "Método de instalación", value: input.installationMethod },
    { label: "Urgencia", value: input.urgency },
    { label: "Cantidad", value: input.quantity },
    { label: "Evidencia", value: input.evidence }
  ]);

  drawTotalBox(doc, y, "Total estimado", input.estimatedAmount);

  drawFooter(doc, {
    lines: [
      "Documento preliminar para validación comercial. Sujeto a visita técnica.",
      "Vigencia de la estimación: 15 días naturales."
    ],
    contact: "Braille International · contacto@bidesign.local"
  });

  const raw = doc.output("arraybuffer");
  return Buffer.from(raw);
}
