import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
  });

  return [
    "scrypt",
    16384,
    8,
    1,
    salt.toString("base64url"),
    derived.toString("base64url")
  ].join("$");
}

async function main() {
  const email = (
    process.env.BRAILLE_BOOTSTRAP_EMAIL ?? "admin@bidesign.local"
  )
    .trim()
    .toLowerCase();
  const name = (process.env.BRAILLE_BOOTSTRAP_NAME ?? "Administrador Braille").trim();
  const password = process.env.BRAILLE_BOOTSTRAP_PASSWORD ?? "";

  if (password.length < 10) {
    throw new Error("BRAILLE_BOOTSTRAP_PASSWORD requiere al menos 10 caracteres.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing?.passwordHash && existing.role === "ADMIN" && existing.isActive) {
    console.log("AUTH_BOOTSTRAP_EXISTS");
    return;
  }

  const passwordHash = hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      role: "ADMIN",
      passwordHash,
      isActive: true
    },
    update: {
      name,
      role: "ADMIN",
      passwordHash,
      isActive: true
    }
  });

  console.log("AUTH_BOOTSTRAP_CREATED");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
