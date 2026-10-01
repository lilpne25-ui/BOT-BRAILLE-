import { LeadSource, Prisma } from "@prisma/client";
import { createLeadWithCode } from "@/modules/leads/create-lead-with-code";

type TxClient = Prisma.TransactionClient;

export type HumanReviewLeadInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  projectType: string;
  source: LeadSource;
  painPoint: string;
  internalNotes: string;
  nextAction?: string;
};

export type HumanReviewLeadOutcome = {
  lead: Prisma.LeadGetPayload<{
    include: {
      contacts: true;
      owner: true;
    };
  }>;
  created: boolean;
  ownerName: string | null;
};

const FALLBACK_EMAILS = new Set([
  "contacto-whatsapp@demo.mx",
  "sin-correo@demo.mx"
]);

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

function isUsableEmail(value: string) {
  const normalized = normalizeEmail(value);
  return normalized.includes("@") && !FALLBACK_EMAILS.has(normalized);
}

function isUsablePhone(value: string) {
  return normalizePhone(value).length >= 8;
}

async function findExistingMatch(
  tx: TxClient,
  input: HumanReviewLeadInput
): Promise<{ leadId: string; contactId?: string } | null> {
  const contactFilters: Prisma.ContactWhereInput[] = [];

  if (isUsableEmail(input.email)) {
    contactFilters.push({
      email: input.email.trim()
    });
  }

  if (isUsablePhone(input.phone)) {
    contactFilters.push({
      phone: input.phone.trim()
    });
  }

  if (contactFilters.length > 0) {
    const contact = await tx.contact.findFirst({
      where: {
        OR: contactFilters
      },
      select: {
        id: true,
        leadId: true
      }
    });

    if (contact) {
      return {
        leadId: contact.leadId,
        contactId: contact.id
      };
    }
  }

  const lead = await tx.lead.findFirst({
    where: {
      companyName: input.companyName.trim(),
      city: input.city.trim()
    },
    select: {
      id: true
    }
  });

  return lead ? { leadId: lead.id } : null;
}

function appendQualificationNotes(previous: string, incoming: string) {
  const separator = "\n\n--- Nueva precalificación omnicanal ---\n";
  return `${previous.trim()}${separator}${incoming.trim()}`.trim();
}

export async function upsertHumanReviewLead(
  tx: TxClient,
  input: HumanReviewLeadInput
): Promise<HumanReviewLeadOutcome> {
  const existingMatch = await findExistingMatch(tx, input);
  const salesOwner = await tx.user.findFirst({
    where: {
      role: "SALES"
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (existingMatch) {
    const currentLead = await tx.lead.findUniqueOrThrow({
      where: {
        id: existingMatch.leadId
      },
      select: {
        ownerId: true,
        internalNotes: true
      }
    });

    await tx.lead.update({
      where: {
        id: existingMatch.leadId
      },
      data: {
        companyName: input.companyName.trim(),
        city: input.city.trim(),
        projectType: input.projectType.trim(),
        status: "DIAGNOSIS",
        source: input.source,
        painPoint: input.painPoint.trim(),
        estimatedValue: 0,
        nextAction:
          input.nextAction ??
          "Revisión humana del expediente y preparación de cotización.",
        nextActionDate: new Date(),
        internalNotes: appendQualificationNotes(
          currentLead.internalNotes,
          input.internalNotes
        ),
        owner:
          currentLead.ownerId || !salesOwner
            ? undefined
            : {
                connect: {
                  id: salesOwner.id
                }
              }
      }
    });

    if (existingMatch.contactId) {
      await tx.contact.update({
        where: {
          id: existingMatch.contactId
        },
        data: {
          name: input.contactName.trim(),
          email: input.email.trim(),
          phone: input.phone.trim(),
          isPrimary: true
        }
      });
    } else {
      await tx.contact.create({
        data: {
          leadId: existingMatch.leadId,
          name: input.contactName.trim(),
          email: input.email.trim(),
          phone: input.phone.trim(),
          isPrimary: true
        }
      });
    }

    const lead = await tx.lead.findUniqueOrThrow({
      where: {
        id: existingMatch.leadId
      },
      include: {
        contacts: true,
        owner: true
      }
    });

    return {
      lead,
      created: false,
      ownerName: lead.owner?.name ?? null
    };
  }

  const lead = await createLeadWithCode(tx, {
    companyName: input.companyName.trim(),
    city: input.city.trim(),
    projectType: input.projectType.trim(),
    status: "DIAGNOSIS",
    source: input.source,
    painPoint: input.painPoint.trim(),
    estimatedValue: 0,
    nextAction:
      input.nextAction ??
      "Revisión humana del expediente y preparación de cotización.",
    nextActionDate: new Date(),
    internalNotes: input.internalNotes.trim(),
    owner: salesOwner
      ? {
          connect: {
            id: salesOwner.id
          }
        }
      : undefined,
    contacts: {
      create: {
        name: input.contactName.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        isPrimary: true
      }
    }
  });

  const leadWithOwner = await tx.lead.findUniqueOrThrow({
    where: {
      id: lead.id
    },
    include: {
      contacts: true,
      owner: true
    }
  });

  return {
    lead: leadWithOwner,
    created: true,
    ownerName: leadWithOwner.owner?.name ?? null
  };
}