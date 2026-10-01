import {
  PrismaClient
} from "@prisma/client";

const prisma =
  new PrismaClient();

function asRecord(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value;
}

function hasCascadeSnapshot(
  metadata
) {
  const record =
    asRecord(metadata);
  const snapshot =
    asRecord(
      record.cascadeSnapshot
    );

  return (
    snapshot.version ===
      "CASCADE_V1" &&
    typeof snapshot.leadCode ===
      "string" &&
    typeof snapshot.client ===
      "string" &&
    typeof snapshot.city ===
      "string"
  );
}

async function main() {
  const quotes =
    await prisma.quote.findMany({
      include: {
        lead: {
          include: {
            contacts: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

  let backfilled = 0;
  let alreadyReady = 0;

  for (const quote of quotes) {
    const metadata =
      asRecord(
        quote.pdfMetadata
      );

    if (
      hasCascadeSnapshot(
        metadata
      )
    ) {
      alreadyReady += 1;
      continue;
    }

    const primaryContact =
      quote.lead.contacts.find(
        (contact) =>
          contact.isPrimary
      ) ??
      quote.lead.contacts[0];

    const snapshot = {
      version:
        "CASCADE_V1",
      capturedAt:
        quote.createdAt.toISOString(),
      leadCode:
        quote.lead.code,
      client:
        quote.lead.companyName,
      contactName:
        primaryContact?.name ??
        "Contacto pendiente",
      contactEmail:
        primaryContact?.email ??
        "",
      contactPhone:
        primaryContact?.phone ??
        "",
      city:
        quote.lead.city,
      projectType:
        quote.lead.projectType
    };

    await prisma.quote.update({
      where: {
        id: quote.id
      },
      data: {
        pdfMetadata: {
          ...metadata,
          cascadeSnapshot:
            snapshot
        }
      }
    });

    backfilled += 1;
  }

  console.log(
    `CASCADE_BACKFILL_OK totalQuotes=${quotes.length} backfilled=${backfilled} alreadyReady=${alreadyReady}`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
