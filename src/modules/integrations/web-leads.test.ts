import {
  describe,
  expect,
  it
} from "vitest";
import {
  buildProjectSummary,
  buildWebhookFingerprint,
  isSameWebhookRequest,
  isWebhookAuthorized,
  normalizeEmail,
  normalizePhone,
  webLeadSchema
} from "@/modules/integrations/web-leads";

const sample = {
  requestId:
    "sitejet-123",
  nombre:
    "Carlos Lopez",
  empresa:
    "Hospital ABC",
  telefono:
    "+52 722 123 4567",
  correo:
    "CARLOS@HospitalABC.mx",
  ciudad:
    "Toluca",
  productoServicio:
    "Senalizacion Braille",
  medidasAproximadas:
    "20x10 cm",
  materialAcabado:
    "Acero inoxidable",
  cantidad: "20",
  fechaRequerida:
    "2026-09-15",
  usoLugarColocacion:
    "Interior hospital",
  logoAplicacion:
    "Si",
  referenciaDiseno:
    "Referencia del cliente",
  comentarios:
    "Requiere visita"
};

describe(
  "web leads integration",
  () => {
    it(
      "normaliza correo y telefono",
      () => {
        expect(
          normalizeEmail(
            sample.correo
          )
        ).toBe(
          "carlos@hospitalabc.mx"
        );

        expect(
          normalizePhone(
            sample.telefono
          )
        ).toBe(
          "+527221234567"
        );
      }
    );

    it(
      "acepta cantidad enviada como texto",
      () => {
        const parsed =
          webLeadSchema.parse(
            sample
          );

        expect(
          parsed.cantidad
        ).toBe(20);
      }
    );

    it(
      "genera resumen del proyecto",
      () => {
        const parsed =
          webLeadSchema.parse(
            sample
          );

        expect(
          buildProjectSummary(
            parsed
          )
        ).toContain(
          "Acero inoxidable"
        );
      }
    );

    it(
      "genera fingerprint estable",
      () => {
        const parsed =
          webLeadSchema.parse(
            sample
          );

        expect(
          buildWebhookFingerprint(
            parsed
          )
        ).toHaveLength(
          64
        );
      }
    );

    it(
      "valida la clave del webhook",
      () => {
        const secret =
          "1234567890123456789012345678901234567890";
        const headers =
          new Headers({
            "x-bi-design-webhook-key":
              secret
          });

        expect(
          isWebhookAuthorized(
            headers,
            secret
          )
        ).toBe(true);
      }
    );

    it(
      "reconoce reintentos por requestId",
      () => {
        expect(
          isSameWebhookRequest(
            {
              integration:
                "BI_DESIGN_WEB_V1",
              requestId:
                "sitejet-123",
              fingerprint:
                "abc"
            },
            {
              requestId:
                "sitejet-123",
              fingerprint:
                "xyz"
            }
          )
        ).toBe(true);
      }
    );
  }
);
