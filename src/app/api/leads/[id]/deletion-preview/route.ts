export const dynamic =
  "force-dynamic";

import {
  NextResponse
} from "next/server";
import {
  prisma
} from "@/lib/prisma";
import {
  getActiveAdmin
} from "@/lib/auth/active-admin";
import {
  buildProspectDeleteConfirmation,
  totalCascadeRecords
} from "@/modules/leads/cascade-delete";
import {
  collectLeadCascade
} from "@/modules/leads/cascade-delete-server";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const admin =
    await getActiveAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Solo un administrador activo puede consultar una eliminacion en cascada."
      },
      {
        status: 403
      }
    );
  }

  const cascade =
    await collectLeadCascade(
      prisma,
      context.params.id
    );

  if (!cascade) {
    return NextResponse.json(
      {
        error:
          "Prospecto no encontrado."
      },
      {
        status: 404
      }
    );
  }

  return NextResponse.json({
    code:
      cascade.lead.code,
    client:
      cascade.lead.companyName,
    city:
      cascade.lead.city,
    confirmationText:
      buildProspectDeleteConfirmation(
        cascade.lead.code
      ),
    totalRecords:
      totalCascadeRecords(
        cascade.impact
      ),
    impact:
      cascade.impact,
    auditPolicy:
      "Los registros de auditoria se conservan, pero sus referencias a entidades eliminadas se liberan."
  });
}
