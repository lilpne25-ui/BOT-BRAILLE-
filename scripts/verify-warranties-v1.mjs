import {
  PrismaClient
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [
    warranties,
    eligibleProjects,
    sample
  ] = await Promise.all([
    prisma.warranty.count(),
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
    }),
    prisma.warranty.findFirst({
      select: {
        id: true,
        code: true,
        warrantyType: true,
        coverage: true,
        nextAction: true
      }
    })
  ]);

  console.log(
    `WARRANTIES_V1_OK warranties=${warranties} eligibleProjects=${eligibleProjects} schemaFields=OK`
  );

  if (sample) {
    console.log(
      `SAMPLE ${sample.code} type=${sample.warrantyType}`
    );
  }
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
