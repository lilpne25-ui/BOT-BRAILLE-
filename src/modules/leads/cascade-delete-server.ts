import {
  Prisma
} from "@prisma/client";
import {
  LeadCascadeImpact
} from "@/modules/leads/cascade-delete";

export type LeadCascadeCollection = {
  lead: {
    id: string;
    code: string;
    companyName: string;
    city: string;
  };
  quoteIds: string[];
  projectIds: string[];
  warrantyIds: string[];
  conversationIds: string[];
  conversationSessionIds: string[];
  impact: LeadCascadeImpact;
};

export async function collectLeadCascade(
  db: Prisma.TransactionClient,
  code: string
): Promise<
  LeadCascadeCollection | null
> {
  const lead =
    await db.lead.findUnique({
      where: {
        code
      },
      select: {
        id: true,
        code: true,
        companyName: true,
        city: true
      }
    });

  if (!lead) {
    return null;
  }

  const quotes =
    await db.quote.findMany({
      where: {
        leadId: lead.id
      },
      select: {
        id: true
      }
    });

  const quoteIds =
    quotes.map(
      (quote) => quote.id
    );

  const projects =
    await db.project.findMany({
      where: {
        OR: [
          {
            leadId:
              lead.id
          },
          {
            quoteId: {
              in: quoteIds
            }
          }
        ]
      },
      select: {
        id: true
      }
    });

  const projectIds =
    projects.map(
      (project) =>
        project.id
    );

  const warranties =
    await db.warranty.findMany({
      where: {
        OR: [
          {
            leadId:
              lead.id
          },
          {
            projectId: {
              in:
                projectIds
            }
          }
        ]
      },
      select: {
        id: true
      }
    });

  const warrantyIds =
    warranties.map(
      (warranty) =>
        warranty.id
    );

  const conversations =
    await db.conversation.findMany({
      where: {
        leadId:
          lead.id
      },
      select: {
        id: true
      }
    });

  const conversationIds =
    conversations.map(
      (conversation) =>
        conversation.id
    );

  const sessions =
    await db.conversationSession.findMany({
      where: {
        conversationId: {
          in:
            conversationIds
        }
      },
      select: {
        id: true
      }
    });

  const conversationSessionIds =
    sessions.map(
      (session) =>
        session.id
    );

  const [
    contacts,
    quoteItems,
    conversationMessages,
    auditEventsPreserved
  ] =
    await Promise.all([
      db.contact.count({
        where: {
          leadId:
            lead.id
        }
      }),
      db.quoteItem.count({
        where: {
          quoteId: {
            in:
              quoteIds
          }
        }
      }),
      db.conversationMessage.count({
        where: {
          conversationId: {
            in:
              conversationIds
          }
        }
      }),
      db.activityLog.count({
        where: {
          OR: [
            {
              leadId:
                lead.id
            },
            {
              quoteId: {
                in:
                  quoteIds
              }
            },
            {
              projectId: {
                in:
                  projectIds
              }
            },
            {
              warrantyId: {
                in:
                  warrantyIds
              }
            },
            {
              conversationId: {
                in:
                  conversationIds
              }
            },
            {
              conversationSessionId: {
                in:
                  conversationSessionIds
              }
            }
          ]
        }
      })
    ]);

  return {
    lead,
    quoteIds,
    projectIds,
    warrantyIds,
    conversationIds,
    conversationSessionIds,
    impact: {
      contacts,
      quotes:
        quoteIds.length,
      quoteItems,
      projects:
        projectIds.length,
      warranties:
        warrantyIds.length,
      conversations:
        conversationIds.length,
      conversationSessions:
        conversationSessionIds.length,
      conversationMessages,
      auditEventsPreserved
    }
  };
}
