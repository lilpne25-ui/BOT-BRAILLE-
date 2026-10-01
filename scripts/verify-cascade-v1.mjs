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

function validSnapshot(
  metadata
) {
  const snapshot =
    asRecord(
      asRecord(metadata)
        .cascadeSnapshot
    );

  return (
    snapshot.version ===
      "CASCADE_V1" &&
    typeof snapshot.leadCode ===
      "string" &&
    typeof snapshot.client ===
      "string" &&
    typeof snapshot.contactName ===
      "string" &&
    typeof snapshot.city ===
      "string"
  );
}

async function main() {
  const [
    quotes,
    projectsLinked,
    warrantiesLinked,
    acceptedWithoutProject,
    installedWithoutWarranty
  ] =
    await Promise.all([
      prisma.quote.findMany({
        select: {
          id: true,
          pdfMetadata: true
        }
      }),
      prisma.project.count({
        where: {
          quoteId: {
            not: null
          }
        }
      }),
      prisma.warranty.count({
        where: {
          projectId: {
            not: null
          }
        }
      }),
      prisma.quote.count({
        where: {
          status:
            "ACCEPTED",
          projects: {
            none: {}
          }
        }
      }),
      prisma.project.count({
        where: {
          status: {
            in: [
              "INSTALLED",
              "CLOSED"
            ]
          },
          warranties: {
            none: {}
          }
        }
      })
    ]);

  const snapshots =
    quotes.filter(
      (quote) =>
        validSnapshot(
          quote.pdfMetadata
        )
    ).length;

  if (
    snapshots !==
    quotes.length
  ) {
    throw new Error(
      `Hay ${quotes.length - snapshots} cotizaciones sin snapshot CASCADE_V1.`
    );
  }

  console.log(
    [
      "CASCADE_V1_OK",
      `quotes=${quotes.length}`,
      `snapshots=${snapshots}`,
      `projectsLinked=${projectsLinked}`,
      `warrantiesLinked=${warrantiesLinked}`,
      `acceptedWithoutProject=${acceptedWithoutProject}`,
      `installedWithoutWarranty=${installedWithoutWarranty}`
    ].join(" ")
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
