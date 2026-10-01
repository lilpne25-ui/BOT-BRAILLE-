import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      role: true,
      isActive: true,
      permissions: true
    }
  });

  const activeAdmins = users.filter(
    (user) => user.role === "ADMIN" && user.isActive
  ).length;

  if (activeAdmins < 1) {
    throw new Error("No existe un administrador activo.");
  }

  console.log(`USERS_V2_OK users=${users.length} activeAdmins=${activeAdmins}`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
