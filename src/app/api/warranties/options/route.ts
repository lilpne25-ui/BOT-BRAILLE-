export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [
    responsibleUsers,
    eligibleProjects
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: [
            "ADMIN",
            "OPERATIONS"
          ]
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: {
        name: "asc"
      }
    }),
    prisma.project.findMany({
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
      },
      include: {
        lead: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 50
    })
  ]);

  return NextResponse.json({
    responsibleUsers,
    eligibleProjects:
      eligibleProjects.map(
        (project) => ({
          code:
            project.code,
          client:
            project.clientName,
          project:
            project.name,
          city:
            project.city,
          solutionInstalled:
            project.solutionType,
          responsible:
            project.responsible,
          evidenceCount:
            project.evidenceCount,
          leadCode:
            project.lead?.code ??
            undefined,
          estimatedInstallation:
            project
              .estimatedInstallation
              .toISOString()
              .slice(0, 10)
        })
      )
  });
}
