import {
  describe,
  expect,
  it
} from "vitest";
import {
  CASCADE_VERSION,
  createCascadeSnapshot,
  preserveCascadeSnapshot,
  readCascadeSnapshot,
  withCascadeSnapshot
} from "@/modules/cascade/operational";

describe("cascade operational helpers", () => {
  it("crea un snapshot estable del prospecto", () => {
    const snapshot =
      createCascadeSnapshot({
        leadCode:
          "LEAD-2026-0001",
        client:
          "Hospital ABC",
        contactName:
          "Juan Perez",
        contactEmail:
          "juan@example.com",
        contactPhone:
          "7220000000",
        city:
          "Toluca",
        projectType:
          "Senalizacion"
      });

    expect(snapshot.version).toBe(
      CASCADE_VERSION
    );
    expect(snapshot.client).toBe(
      "Hospital ABC"
    );
  });

  it("lee el snapshot desde metadata", () => {
    const snapshot =
      createCascadeSnapshot({
        leadCode: "L-1",
        client: "Cliente",
        city: "Toluca",
        projectType: "Braille"
      });

    const metadata =
      withCascadeSnapshot(
        {
          observations:
            "Dato comercial"
        },
        snapshot
      );

    expect(
      readCascadeSnapshot(
        metadata
      )?.leadCode
    ).toBe("L-1");
  });

  it("preserva el snapshot original al editar una cotizacion", () => {
    const first =
      createCascadeSnapshot({
        leadCode: "L-1",
        client:
          "Cliente original",
        city: "Toluca",
        projectType: "Braille",
        capturedAt:
          "2026-08-10T00:00:00.000Z"
      });

    const fallback =
      createCascadeSnapshot({
        leadCode: "L-1",
        client:
          "Cliente cambiado",
        city: "Metepec",
        projectType: "Otro"
      });

    const result =
      preserveCascadeSnapshot(
        withCascadeSnapshot(
          {
            total: 100
          },
          first
        ),
        {
          total: 150
        },
        fallback
      );

    expect(
      readCascadeSnapshot(
        result
      )?.client
    ).toBe(
      "Cliente original"
    );
    expect(
      (result as Record<
        string,
        unknown
      >).total
    ).toBe(150);
  });
});
