import { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

const CODE_PREFIX = "BI-";

async function nextLeadCode(tx: TxClient) {
  const existing = await tx.lead.findMany({
    where: { code: { startsWith: CODE_PREFIX } },
    select: { code: true }
  });

  const maxSequence = existing.reduce((max, lead) => {
    const match = lead.code.match(/^BI-(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return Math.max(max, value);
  }, 0);

  return `${CODE_PREFIX}${String(maxSequence + 1).padStart(3, "0")}`;
}

export async function createLeadWithCode(tx: TxClient, data: Omit<Prisma.LeadCreateInput, "code">) {
  const code = await nextLeadCode(tx);

  return tx.lead.create({
    data: { ...data, code },
    include: { contacts: true }
  });
}
