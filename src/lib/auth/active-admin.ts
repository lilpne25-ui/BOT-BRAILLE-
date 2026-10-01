import {
  prisma
} from "@/lib/prisma";
import {
  getCurrentSession
} from "@/lib/auth/session";

export async function getActiveAdmin() {
  const session =
    getCurrentSession();

  if (
    !session ||
    session.role !== "ADMIN"
  ) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: session.id,
      isActive: true,
      role: "ADMIN"
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });
}
