import { prisma } from "@/lib/prisma";
import { ConversationCapturedData } from "@/types/conversation";

function parseQuantityToNumber(quantity: string) {
  const match = quantity.match(/\d+(?:[.,]\d+)?/);
  if (!match) return 50;
  return Number(match[0].replace(",", ".")) || 50;
}

export async function estimateAmountFromDb(capturedData: ConversationCapturedData): Promise<number> {
  const quantity = parseQuantityToNumber(capturedData.quantity ?? "");
  const solutionType = capturedData.solutionType ?? "No estoy seguro";
  const material = capturedData.material ?? "TPU";
  const urgency = capturedData.urgency ?? "Normal";
  const usage = capturedData.usage ?? "Interior";
  const installationMethod = capturedData.installationMethod ?? "Instalacion especializada";

  // 1. Fetch Product
  const product = await prisma.product.findFirst({
    where: { solutionType }
  });

  const solutionFactor: Record<string, number> = {
    "Piso podotactil": 1180,
    "Senalizacion braille": 1450,
    "Mapas hapticos": 14500,
    Directorios: 8800,
    Atriles: 7200,
    "Proteccion civil": 980,
    "Arquitectura especializada": 2600,
    "No estoy seguro": 1300
  };
  const solutionBase = product ? product.basePrice : (solutionFactor[solutionType] ?? 1300);

  // 2. Fetch Material
  const materialObj = await prisma.material.findFirst({
    where: { name: material }
  });
  const materialMultiplier: Record<string, number> = {
    TPU: 1,
    "Acero inoxidable": 1.45,
    Policoncreto: 1.2,
    Acrilico: 1.12,
    Aluminio: 1.25,
    "Recomendar material": 1.18
  };
  const materialFactor = materialObj ? materialObj.multiplier : (materialMultiplier[material] ?? 1);

  // 3. Default Urgency Multiplier
  const urgencyMultiplier: Record<string, number> = {
    Normal: 1,
    Prioritario: 1.08,
    Urgente: 1.15,
    "Solo cotizando": 1
  };
  const urgencyFactor = urgencyMultiplier[urgency] ?? 1;

  // 4. Fetch Active Price Rules
  const activeRules = await prisma.priceRule.findMany({
    where: { isActive: true }
  });

  // Filter rules in memory based on captured details
  const matchingRules = activeRules.filter((rule) => {
    if (rule.productId && rule.productId !== product?.id) return false;
    if (rule.materialId && rule.materialId !== materialObj?.id) return false;
    if (rule.usageType && rule.usageType !== usage) return false;
    if (rule.urgencyLevel && rule.urgencyLevel !== urgency) return false;
    if (rule.installationMethod && rule.installationMethod !== installationMethod) return false;
    return true;
  });

  let multiplierAccumulator = 1;
  let fixedDeltaAccumulator = 0;

  for (const rule of matchingRules) {
    multiplierAccumulator *= rule.multiplier;
    if (rule.fixedDelta) {
      fixedDeltaAccumulator += rule.fixedDelta;
    }
  }

  const baseEstimate = solutionBase * materialFactor * urgencyFactor * quantity;
  const finalAmount = Math.round(baseEstimate * multiplierAccumulator + fixedDeltaAccumulator);

  return finalAmount;
}
