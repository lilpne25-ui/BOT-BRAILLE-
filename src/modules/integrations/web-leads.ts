import {
  createHash,
  timingSafeEqual
} from "crypto";
import {
  z
} from "zod";

const optionalText = (
  max = 1000
) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .default("");

const quantitySchema =
  z.preprocess(
    (value) => {
      if (
        value === "" ||
        value === null ||
        value === undefined
      ) {
        return undefined;
      }

      if (
        typeof value ===
        "string"
      ) {
        const parsed =
          Number(
            value.trim()
          );

        return Number.isFinite(
          parsed
        )
          ? parsed
          : value;
      }

      return value;
    },
    z
      .number()
      .positive()
      .max(1_000_000)
      .optional()
  );

export const webLeadSchema =
  z.object({
    requestId:
      z
        .string()
        .trim()
        .min(3)
        .max(160)
        .optional(),
    nombre:
      z
        .string()
        .trim()
        .min(2)
        .max(120),
    empresa:
      z
        .string()
        .trim()
        .min(2)
        .max(180),
    telefono:
      z
        .string()
        .trim()
        .min(7)
        .max(40),
    correo:
      z
        .string()
        .trim()
        .email()
        .max(180),
    ciudad:
      z
        .string()
        .trim()
        .min(2)
        .max(140),
    productoServicio:
      z
        .string()
        .trim()
        .min(2)
        .max(180),
    medidasAproximadas:
      optionalText(1000),
    materialAcabado:
      optionalText(500),
    cantidad:
      quantitySchema,
    fechaRequerida:
      optionalText(100),
    usoLugarColocacion:
      optionalText(1000),
    logoAplicacion:
      optionalText(1000),
    referenciaDiseno:
      optionalText(1500),
    comentarios:
      optionalText(2500),
    urlPaginaOrigen:
      optionalText(1000),
    consentimientoPrivacidad:
      z
        .boolean()
        .optional()
  });

export type WebLeadInput =
  z.infer<
    typeof webLeadSchema
  >;

export function normalizeEmail(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

export function normalizePhone(
  value: string
) {
  const trimmed =
    value.trim();
  const hasPlus =
    trimmed.startsWith(
      "+"
    );
  const digits =
    trimmed.replace(
      /\D/g,
      ""
    );

  return hasPlus
    ? `+${digits}`
    : digits;
}

export function normalizeComparableText(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );
}

export function buildProjectSummary(
  input: WebLeadInput
) {
  const rows = [
    [
      "Producto / servicio",
      input.productoServicio
    ],
    [
      "Medidas aproximadas",
      input.medidasAproximadas
    ],
    [
      "Material / acabado",
      input.materialAcabado
    ],
    [
      "Cantidad",
      input.cantidad !==
        undefined
        ? String(
            input.cantidad
          )
        : ""
    ],
    [
      "Fecha requerida",
      input.fechaRequerida
    ],
    [
      "Uso / lugar de colocacion",
      input.usoLugarColocacion
    ],
    [
      "Logo / aplicacion",
      input.logoAplicacion
    ],
    [
      "Referencia / diseno",
      input.referenciaDiseno
    ],
    [
      "Comentarios",
      input.comentarios
    ]
  ].filter(
    ([, value]) =>
      Boolean(
        value?.trim()
      )
  );

  return rows
    .map(
      ([label, value]) =>
        `${label}: ${value}`
    )
    .join("\n");
}

export function buildInternalNotes(
  input: WebLeadInput,
  receivedAt:
    Date
) {
  const lines = [
    "Solicitud recibida desde BI DESIGN / sitio web.",
    `Recibida: ${receivedAt.toISOString()}`,
    input.requestId
      ? `Request ID: ${input.requestId}`
      : "",
    input.urlPaginaOrigen
      ? `Pagina origen: ${input.urlPaginaOrigen}`
      : "",
    input.consentimientoPrivacidad !==
      undefined
      ? `Consentimiento privacidad: ${
          input.consentimientoPrivacidad
            ? "Si"
            : "No"
        }`
      : ""
  ].filter(Boolean);

  return lines.join(
    "\n"
  );
}

export function buildWebhookFingerprint(
  input: WebLeadInput
) {
  const normalized = {
    nombre:
      normalizeComparableText(
        input.nombre
      ),
    empresa:
      normalizeComparableText(
        input.empresa
      ),
    telefono:
      normalizePhone(
        input.telefono
      ),
    correo:
      normalizeEmail(
        input.correo
      ),
    productoServicio:
      normalizeComparableText(
        input.productoServicio
      ),
    medidasAproximadas:
      normalizeComparableText(
        input.medidasAproximadas
      ),
    materialAcabado:
      normalizeComparableText(
        input.materialAcabado
      ),
    cantidad:
      input.cantidad ??
      null,
    fechaRequerida:
      input.fechaRequerida,
    comentarios:
      normalizeComparableText(
        input.comentarios
      )
  };

  return createHash(
    "sha256"
  )
    .update(
      JSON.stringify(
        normalized
      )
    )
    .digest("hex");
}

function bufferEquals(
  a: string,
  b: string
) {
  const left =
    Buffer.from(
      a,
      "utf8"
    );
  const right =
    Buffer.from(
      b,
      "utf8"
    );

  if (
    left.length !==
    right.length
  ) {
    return false;
  }

  return timingSafeEqual(
    left,
    right
  );
}

export function readWebhookCredential(
  headers: Headers
) {
  const biDesign =
    headers
      .get(
        "x-bi-design-webhook-key"
      )
      ?.trim();

  if (biDesign) {
    return biDesign;
  }

  // Compatibilidad con las pruebas/instalación anteriores.
  const legacyBraille =
    headers
      .get(
        "x-braille-webhook-key"
      )
      ?.trim();

  if (legacyBraille) {
    return legacyBraille;
  }

  const authorization =
    headers
      .get(
        "authorization"
      )
      ?.trim();

  if (
    authorization
      ?.toLowerCase()
      .startsWith(
        "bearer "
      )
  ) {
    return authorization
      .slice(7)
      .trim();
  }

  return "";
}

export function isWebhookAuthorized(
  headers: Headers,
  expectedSecret:
    string
) {
  const credential =
    readWebhookCredential(
      headers
    );

  if (
    !credential ||
    expectedSecret.length <
      32
  ) {
    return false;
  }

  return bufferEquals(
    credential,
    expectedSecret
  );
}

export function asRecord(
  value: unknown
): Record<
  string,
  unknown
> {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return {};
  }

  return value as Record<
    string,
    unknown
  >;
}

export function isSameWebhookRequest(
  metadata: unknown,
  options: {
    requestId?: string;
    fingerprint: string;
  }
) {
  const record =
    asRecord(
      metadata
    );

  if (
    record.integration !==
    "BI_DESIGN_WEB_V1"
  ) {
    return false;
  }

  if (
    options.requestId &&
    record.requestId ===
      options.requestId
  ) {
    return true;
  }

  return (
    record.fingerprint ===
    options.fingerprint
  );
}
