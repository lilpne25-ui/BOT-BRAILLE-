import {
  describe,
  expect,
  it
} from "vitest";
import {
  appendTimelineEvent,
  formatProjectCode,
  mapProjectRiskToDb,
  mapProjectStatusToDb,
  parseProjectSequence,
  recommendedProgress
} from "@/modules/projects/operational";

describe("project operational helpers", () => {
  it("convierte estados y riesgos a Prisma", () => {
    expect(mapProjectStatusToDb("En produccion")).toBe("IN_PRODUCTION");
    expect(mapProjectStatusToDb("Cerrado")).toBe("CLOSED");
    expect(mapProjectRiskToDb("Medio")).toBe("MEDIUM");
  });

  it("genera folio de proyecto anual correlativo", () => {
    expect(formatProjectCode(2026, 7)).toBe("PR-2026-0007");
    expect(parseProjectSequence("PR-2026-0042", 2026)).toBe(42);
    expect(parseProjectSequence("PR-2401", 2026)).toBeNull();
  });

  it("sugiere avance minimo segun estado sin reducir avance existente", () => {
    expect(recommendedProgress("Aprobado", 0)).toBe(15);
    expect(recommendedProgress("En instalacion", 88)).toBe(88);
    expect(recommendedProgress("Cerrado", 22)).toBe(100);
  });

  it("agrega eventos nuevos al inicio del timeline", () => {
    const rows = appendTimelineEvent(
      [
        {
          id: "OLD",
          date: "2026-08-01",
          title: "Anterior",
          note: "Evento anterior"
        }
      ],
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
