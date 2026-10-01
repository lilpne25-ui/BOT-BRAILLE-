import {
  PrismaClient
} from "@prisma/client";

const prisma =
  new PrismaClient();

async function main() {
  const [
    leads,
    quotes,
    projects,
    warranties,
    activities
  ] =
    await Promise.all([
      prisma.lead.count(),
      prisma.quote.count(),
      prisma.project.count(),
      prisma.warranty.count(),
      prisma.activityLog.count()
    ]);

  const acceptedValue =
    await prisma.quote.aggregate({
      where: {
        status:
          "ACCEPTED"
      },
      _sum: {
        total: true
      }
    });

  console.log(
    [
      "DASHBOARD_REAL_V1_DATA_OK",
      `leads=${leads}`,
      `quotes=${quotes}`,
      `projects=${projects}`,
      `warranties=${warranties}`,
      `activities=${activities}`,
      `acceptedValue=${acceptedValue._sum.total ?? 0}`
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
