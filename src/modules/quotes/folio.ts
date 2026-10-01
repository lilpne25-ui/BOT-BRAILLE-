import { Prisma, PrismaClient } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export async function getNextQuoteSequence(client: PrismaLike, year: number) {
  const latest = await client.quote.aggregate({
    where: { year },
    _max: { sequence: true }
  });
  return (latest._max.sequence ?? 0) + 1;
}

export function formatQuoteFolio(year: number, sequence: number) {
  return `BI-COT-${year}-${String(sequence).padStart(4, "0")}`;
}
