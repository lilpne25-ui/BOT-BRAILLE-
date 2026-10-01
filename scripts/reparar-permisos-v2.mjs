import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaults = {
  ADMIN: [
    "dashboard.view",
    "leads.view",
    "leads.create",
    "leads.edit",
    "quotes.view",
    "quotes.create",
    "quotes.edit",
    "quotes.pdf",
    "catalog.view",
    "catalog.edit",
    "projects.view",
    "projects.edit",
    "warranties.view",
    "warranties.edit",
    "whatsapp.view",
    "whatsapp.manage",
    "users.view",
    "users.manage",
    "users.delete"
  ],

  SALES: [
    "dashboard.view",
    "leads.view",
    "leads.create",
    "leads.edit",
    "quotes.view",
    "quotes.create",
    "quotes.edit",
    "quotes.pdf",
    "catalog.view"
  ],

  OPERATIONS: [
    "dashboard.view",
    "projects.view",
    "projects.edit",
    "warranties.view",
    "warranties.edit"
  ]
};

async function main() {
  const users = await prisma.user.findMany();

  console.log("");
  console.log("===== REPARANDO PERMISOS V2 =====");

  for (const user of users) {
    const permissions = defaults[user.role];

    if (!permissions) {
      console.log(`IGNORADO: ${user.email} - rol desconocido ${user.role}`);
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { permissions }
    });

    console.log(
      `OK: ${user.email} | ${user.role} | ${permissions.length} permisos`
    );
  }

  console.log("");
  console.log("Permisos V2 reparados correctamente.");
  console.log("===== FIN =====");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
