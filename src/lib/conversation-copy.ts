const TITLE_PREFIX = /^(lic|ing|dr|dra|sr|sra|srita|mtro|mtra|prof|c\.p)\.?\s+/i;

export function simpleHash(seed: string) {
  return Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function pickVariant(seed: string, variants: string[]) {
  if (variants.length === 0) return "";
  return variants[simpleHash(seed) % variants.length];
}

export function extractFirstName(fullName: string | undefined) {
  if (!fullName) return undefined;
  const withoutTitle = fullName.trim().replace(TITLE_PREFIX, "");
  const firstWord = withoutTitle.split(/\s+/)[0];
  return firstWord || undefined;
}

export const STARTER_VARIANTS = [
  "¡Perfecto! Registraré tu solicitud para que un ejecutivo pueda revisarla.",
  "Excelente. Reuniré los datos clave de tu proyecto antes de asignarlo a ventas.",
  "Con gusto. Primero completaré tu expediente y después lo revisará un ejecutivo."
];

export const ACKNOWLEDGEMENT_VARIANTS = [
  "Perfecto.",
  "Genial.",
  "Anotado.",
  "Va, entendido."
];

export const POST_COMPLETION_HUMAN_VARIANTS = [
  "Tu expediente ya está en revisión. Un ejecutivo continuará contigo y preparará la cotización.",
  "La información quedó registrada. Un ejecutivo de Braille International revisará los requisitos antes de cotizar."
];
