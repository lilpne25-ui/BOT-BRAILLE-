import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [projects, acceptedWithoutProject, activeOperations] = await Promise.all([
    prisma.project.count(),
    prisma.quote.count({
      where: {
        status: "ACCEPTED",
        projects: {
          none: {}
        }
      }
    }),
    prisma.user.count({
      where: {
        isActive: true,
        role: {
          in: ["ADMIN", "OPERATIONS"]
        }
      }
    })
  ]);

  console.log(
    `PROJECTS_V1_OK projects=${projects} acceptedWithoutProject=${acceptedWithoutProject} activeOperations=${activeOperations}`
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
