import {
  PrismaClient
} from "@prisma/client";

const prisma =
  new PrismaClient();

async function main() {
  const [
    activeAdmins,
    leads,
    quotes,
    projects,
    warranties,
    conversations,
    auditLogs
  ] =
    await Promise.all([
      prisma.user.count({
        where: {
          isActive: true,
          role: "ADMIN"
        }
      }),
      prisma.lead.count(),
      prisma.quote.count(),
      prisma.project.count(),
      prisma.warranty.count(),
      prisma.conversation.count(),
      prisma.activityLog.count()
    ]);

  if (
    activeAdmins < 1
  ) {
    throw new Error(
      "No existe ningun ADMIN activo. La eliminacion quedaria inutilizable."
    );
  }

  console.log(
    [
      "LEAD_DELETE_ADMIN_V1_OK",
      `activeAdmins=${activeAdmins}`,
      `leads=${leads}`,
      `quotes=${quotes}`,
      `projects=${projects}`,
      `warranties=${warranties}`,
      `conversations=${conversations}`,
      `auditLogs=${auditLogs}`
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
