import {
  describe,
  expect,
  it
} from "vitest";
import {
  ageInDays,
  daysUntil,
  isDue,
  isWithinDays,
  projectStatusLabel,
  quoteStatusLabel,
  warrantyStatusLabel
} from "@/modules/dashboard/operational";

describe(
  "dashboard operational helpers",
  () => {
    const now =
      new Date(
        "2026-08-11T12:00:00"
      );

    it(
      "calcula vencimientos por dia",
      () => {
        expect(
          daysUntil(
            new Date(
              "2026-08-12T08:00:00"
            ),
            now
          )
        ).toBe(1);

        expect(
          isDue(
            new Date(
              "2026-08-11T23:00:00"
            ),
            now
          )
        ).toBe(true);

        expect(
          isWithinDays(
            new Date(
              "2026-08-20T12:00:00"
            ),
            14,
            now
          )
        ).toBe(true);
      }
    );

    it(
      "calcula antiguedad",
      () => {
        expect(
          ageInDays(
            new Date(
              "2026-08-06T10:00:00"
            ),
            now
          )
        ).toBe(5);
      }
    );

    it(
      "mapea estados reales",
      () => {
        expect(
          quoteStatusLabel(
            "ACCEPTED"
          )
        ).toBe("Aceptada");

        expect(
          projectStatusLabel(
            "IN_PRODUCTION"
          )
        ).toBe(
          "En produccion"
        );

        expect(
          warrantyStatusLabel(
            "EXPIRING"
          )
        ).toBe(
          "Por vencer"
        );
      }
    );
  }
);
