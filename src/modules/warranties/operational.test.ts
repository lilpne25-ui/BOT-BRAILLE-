import {
  describe,
  expect,
  it
} from "vitest";
import {
  appendWarrantyEvent,
  daysFrom,
  formatWarrantyCode,
  mapWarrantyStatusToDb,
  parseWarrantySequence
} from "@/modules/warranties/operational";

describe("warranty operational helpers", () => {
  it("convierte estados a Prisma", () => {
    expect(mapWarrantyStatusToDb("Activa")).toBe("ACTIVE");
    expect(
      mapWarrantyStatusToDb("Mantenimiento agendado")
    ).toBe("MAINTENANCE_SCHEDULED");
    expect(mapWarrantyStatusToDb("Atendida")).toBe("ATTENDED");
  });

  it("genera folios anuales de garantia", () => {
    expect(formatWarrantyCode(2026, 9)).toBe("GAR-2026-0009");
    expect(
      parseWarrantySequence("GAR-2026-0042", 2026)
    ).toBe(42);
    expect(
      parseWarrantySequence("GAR-2025-0042", 2026)
    ).toBeNull();
  });

  it("calcula fechas futuras sin mutar la original", () => {
    const original = new Date("2026-08-10T12:00:00");
    const future = daysFrom(original, 180);

    expect(
      original.toISOString().slice(0, 10)
    ).toBe("2026-08-10");
    expect(
      future.getTime()
    ).toBeGreaterThan(original.getTime());
  });

  it("agrega eventos al inicio del historial", () => {
    const rows = appendWarrantyEvent(
      [{
        id: "OLD",
        date: "2026-08-01",
        title: "Anterior",
        note: "Evento anterior"
      }],
      {
        id: "NEW",
        date: "2026-08-10",
        title: "Nuevo",
        note: "Evento nuevo"
      }
    );

    expect(rows[0].id).toBe("NEW");
    expect(rows[1].id).toBe("OLD");
  });
});
