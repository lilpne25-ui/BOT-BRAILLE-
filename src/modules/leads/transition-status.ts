import { LeadStatus, Prisma, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TxClient = Prisma.TransactionClient | typeof prisma;

type TransitionParams = {
  leadId: string;
  quoteId: string;
  newLeadStatus: LeadStatus;
  newQuoteStatus: QuoteStatus;
  reasonMessage: string;
  conversationId?: string;
  conversationSessionId?: string;
};

export async function transitionLeadAndQuoteStatus(tx: TxClient, params: TransitionParams) {
  const [lead, quote] = await Promise.all([
    tx.lead.findUniqueOrThrow({ where: { id: params.leadId }, select: { status: true } }),
    tx.quote.findUniqueOrThrow({ where: { id: params.quoteId }, select: { status: true } })
  ]);

  if (lead.status === params.newLeadStatus && quote.status === params.newQuoteStatus) return;

  await tx.lead.update({ where: { id: params.leadId }, data: { status: params.newLeadStatus } });
  await tx.quote.update({ where: { id: params.quoteId }, data: { status: params.newQuoteStatus } });

  await tx.activityLog.createMany({
    data: [
      {
        type: "STATUS_CHANGED",
        message: params.reasonMessage,
        leadId: params.leadId,
        conversationId: params.conversationId,
        conversationSessionId: params.conversationSessionId,
        metadata: { entity: "lead", oldValue: lead.status, newValue: params.newLeadStatus }
      },
      {
        type: "STATUS_CHANGED",
        message: params.reasonMessage,
        leadId: params.leadId,
        quoteId: params.quoteId,
        conversationId: params.conversationId,
        conversationSessionId: params.conversationSessionId,
        metadata: { entity: "quote", oldValue: quote.status, newValue: params.newQuoteStatus }
      }
    ]
  });
}
