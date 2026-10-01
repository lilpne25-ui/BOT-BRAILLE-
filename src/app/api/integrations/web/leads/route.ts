export const dynamic =
  "force-dynamic";

import {
  NextResponse
} from "next/server";
import {
  ZodError
} from "zod";
import {
  prisma
} from "@/lib/prisma";
import {
  createLeadWithCode
} from "@/modules/leads/create-lead-with-code";
import {
  buildInternalNotes,
  buildProjectSummary,
  buildWebhookFingerprint,
  isSameWebhookRequest,
  isWebhookAuthorized,
  normalizeComparableText,
  normalizeEmail,
  normalizePhone,
  webLeadSchema
} from "@/modules/integrations/web-leads";

const INTEGRATION_NAME =
  "BI_DESIGN_WEB_V1";
const MAX_BODY_BYTES =
  32_768;

function enabled() {
  return (
    process.env
      .WEB_LEADS_ENABLED !==
    "0"
  );
}

function webhookSecret() {
  return (
    process.env
      .WEB_LEADS_WEBHOOK_KEY
      ?.trim() ??
    ""
  );
}

function unauthorized() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Credencial de webhook invalida."
    },
    {
      status: 401
    }
  );
}

function disabled() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "La integracion web esta deshabilitada."
    },
    {
      status: 503
    }
  );
}

function appendSection(
  current: string,
  title: string,
  body: string
) {
  const block = [
    title,
    body
  ]
    .filter(Boolean)
    .join("\n");

  if (
    !current.trim()
  ) {
    return block;
  }

  return `${current.trim()}\n\n${block}`;
}

export async function GET(
  request: Request
) {
  if (!enabled()) {
    return disabled();
  }

  if (
    !isWebhookAuthorized(
      request.headers,
      webhookSecret()
    )
  ) {
    return unauthorized();
  }

  return NextResponse.json({
    ok: true,
    integration:
      INTEGRATION_NAME,
    version: "1.0",
    accepts: [
      "POST application/json"
    ],
    authentication: [
      "X-BI-Design-Webhook-Key",
      "Authorization: Bearer",
      "X-Braille-Webhook-Key (legacy)"
    ],
    humanReviewRequired:
      true,
    automaticQuote:
      false
  });
}

export async function POST(
  request: Request
) {
  if (!enabled()) {
    return disabled();
  }

  const secret =
    webhookSecret();

  if (
    secret.length < 32
  ) {
    console.error(
      "WEB_LEADS_WEBHOOK_KEY no esta configurada correctamente."
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Integracion no configurada."
      },
      {
        status: 503
      }
    );
  }

  if (
    !isWebhookAuthorized(
      request.headers,
      secret
    )
  ) {
    return unauthorized();
  }

  const contentType =
    request.headers
      .get(
        "content-type"
      )
      ?.toLowerCase() ??
    "";

  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Content-Type debe ser application/json."
      },
      {
        status: 415
      }
    );
  }

  const declaredLength =
    Number(
      request.headers.get(
        "content-length"
      ) ??
        0
    );

  if (
    Number.isFinite(
      declaredLength
    ) &&
    declaredLength >
      MAX_BODY_BYTES
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "La solicitud excede el tamano permitido."
      },
      {
        status: 413
      }
    );
  }

  try {
    const rawBody =
      await request.text();

    if (
      Buffer.byteLength(
        rawBody,
        "utf8"
      ) >
      MAX_BODY_BYTES
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La solicitud excede el tamano permitido."
        },
        {
          status: 413
        }
      );
    }

    const jsonPayload =
      JSON.parse(
        rawBody
      ) as unknown;

    if (
      jsonPayload &&
      typeof jsonPayload ===
        "object" &&
      !Array.isArray(
        jsonPayload
      )
    ) {
      const eventId =
        (
          request.headers
            .get(
              "x-bi-design-event-id"
            ) ??
          request.headers
            .get(
              "x-braille-event-id"
            )
        )
          ?.trim();

      if (
        eventId &&
        !(
          "requestId" in
          jsonPayload
        )
      ) {
        (
          jsonPayload as Record<
            string,
            unknown
          >
        ).requestId =
          eventId;
      }
    }

    const input =
      webLeadSchema.parse(
        jsonPayload
      );

    const receivedAt =
      new Date();
    const email =
      normalizeEmail(
        input.correo
      );
    const phone =
      normalizePhone(
        input.telefono
      );
    const fingerprint =
      buildWebhookFingerprint(
        input
      );
    const projectSummary =
      buildProjectSummary(
        input
      );
    const webNotes =
      buildInternalNotes(
        input,
        receivedAt
      );

    const result =
      await prisma.$transaction(
        async (tx) => {
          const dedupeSince =
            new Date(
              receivedAt.getTime() -
                (
                  input.requestId
                    ? 30 *
                      24 *
                      60 *
                      60 *
                      1000
                    : 10 *
                      60 *
                      1000
                )
            );

          const recentWebEvents =
            await tx.activityLog.findMany({
              where: {
                createdAt: {
                  gte:
                    dedupeSince
                }
              },
              orderBy: {
                createdAt:
                  "desc"
              },
              take: 500,
              select: {
                leadId: true,
                metadata: true
              }
            });

          const repeated =
            recentWebEvents.find(
              (activity) =>
                isSameWebhookRequest(
                  activity.metadata,
                  {
                    requestId:
                      input.requestId,
                    fingerprint
                  }
                )
            );

          if (
            repeated?.leadId
          ) {
            const existingLead =
              await tx.lead.findUnique({
                where: {
                  id:
                    repeated.leadId
                },
                select: {
                  code: true,
                  companyName: true
                }
              });

            if (
              existingLead
            ) {
              return {
                action:
                  "duplicate_ignored" as const,
                lead:
                  existingLead,
                possibleDuplicateLeadCode:
                  null
              };
            }
          }

          const candidateContact =
            await tx.contact.findFirst({
              where: {
                OR: [
                  {
                    email
                  },
                  {
                    email:
                      input.correo.trim()
                  },
                  {
                    phone
                  },
                  {
                    phone:
                      input.telefono.trim()
                  }
                ]
              },
              include: {
                lead: true
              },
              orderBy: {
                updatedAt:
                  "desc"
              }
            });

          const reusableLead =
            candidateContact &&
            ![
              "WON",
              "LOST"
            ].includes(
              candidateContact
                .lead
                .status
            ) &&
            normalizeComparableText(
              candidateContact
                .lead
                .projectType
            ) ===
              normalizeComparableText(
                input.productoServicio
              ) &&
            normalizeComparableText(
              candidateContact
                .lead
                .companyName
            ) ===
              normalizeComparableText(
                input.empresa
              )
              ? candidateContact
                  .lead
              : null;

          const metadata = {
            integration:
              INTEGRATION_NAME,
            requestId:
              input.requestId ??
              null,
            fingerprint,
            sourcePage:
              input.urlPaginaOrigen ||
              null,
            receivedAt:
              receivedAt.toISOString(),
            automaticQuote:
              false,
            humanReviewRequired:
              true
          };

          if (
            reusableLead &&
            candidateContact
          ) {
            const requestTitle =
              `--- Nueva solicitud web ${receivedAt.toISOString()} ---`;

            const updated =
              await tx.lead.update({
                where: {
                  id:
                    reusableLead.id
                },
                data: {
                  city:
                    input.ciudad,
                  projectType:
                    input.productoServicio,
                  nextAction:
                    "Revisar nueva solicitud web",
                  nextActionDate:
                    receivedAt,
                  painPoint:
                    appendSection(
                      reusableLead.painPoint,
                      requestTitle,
                      projectSummary
                    ),
                  internalNotes:
                    appendSection(
                      reusableLead.internalNotes,
                      requestTitle,
                      webNotes
                    )
                },
                select: {
                  id: true,
                  code: true,
                  companyName: true
                }
              });

            await tx.contact.update({
              where: {
                id:
                  candidateContact.id
              },
              data: {
                name:
                  input.nombre,
                email,
                phone
              }
            });

            await tx.activityLog.create({
              data: {
                type:
                  "STATUS_CHANGED",
                message:
                  `Nueva solicitud web recibida para ${updated.code}. Requiere revision humana.`,
                leadId:
                  updated.id,
                metadata: {
                  ...metadata,
                  action:
                    "updated_existing",
                  leadCode:
                    updated.code,
                  productService:
                    input.productoServicio
                }
              }
            });

            return {
              action:
                "updated_existing" as const,
              lead:
                updated,
              possibleDuplicateLeadCode:
                null
            };
          }

          const possibleDuplicateLeadCode =
            candidateContact
              ?.lead
              .code ??
            null;

          const created =
            await createLeadWithCode(
              tx,
              {
                companyName:
                  input.empresa,
                city:
                  input.ciudad,
                projectType:
                  input.productoServicio,
                status:
                  "NEW",
                source:
                  "WEB",
                painPoint:
                  projectSummary ||
                  `Solicitud de ${input.productoServicio}`,
                estimatedValue:
                  0,
                nextAction:
                  "Revisar solicitud web",
                nextActionDate:
                  receivedAt,
                internalNotes:
                  webNotes,
                contacts: {
                  create: {
                    name:
                      input.nombre,
                    email,
                    phone,
                    isPrimary:
                      true
                  }
                }
              }
            );

          await tx.activityLog.create({
            data: {
              type:
                "LEAD_CREATED",
              message:
                `Solicitud web recibida y prospecto ${created.code} creado. Requiere revision humana.`,
              leadId:
                created.id,
              metadata: {
                ...metadata,
                action:
                  "created",
                leadCode:
                  created.code,
                productService:
                  input.productoServicio,
                possibleDuplicateLeadCode
              }
            }
          });

          return {
            action:
              "created" as const,
            lead: {
              id:
                created.id,
              code:
                created.code,
              companyName:
                created.companyName
            },
            possibleDuplicateLeadCode
          };
        }
      );

    const status =
      result.action ===
      "created"
        ? 201
        : 200;

    return NextResponse.json(
      {
        ok: true,
        action:
          result.action,
        leadCode:
          result.lead.code,
        client:
          result.lead.companyName,
        message:
          result.action ===
          "duplicate_ignored"
            ? "La solicitud ya habia sido recibida. No se genero un duplicado."
            : result.action ===
                "updated_existing"
              ? "Solicitud recibida y agregada al prospecto existente."
              : "Solicitud recibida correctamente y prospecto creado.",
        humanReviewRequired:
          true,
        quoteCreated:
          false,
        possibleDuplicateLeadCode:
          result
            .possibleDuplicateLeadCode
      },
      {
        status
      }
    );
  } catch (error) {
    if (
      error instanceof
      SyntaxError
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "JSON invalido."
        },
        {
          status: 400
        }
      );
    }

    if (
      error instanceof
      ZodError
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La solicitud contiene campos invalidos.",
          fields:
            error.flatten()
              .fieldErrors
        },
        {
          status: 400
        }
      );
    }

    console.error(
      "Web leads integration failed",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo registrar la solicitud."
      },
      {
        status: 500
      }
    );
  }
}
