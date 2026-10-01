import {
  describe,
  expect,
  it
} from "vitest";
import {
  buildProspectDeleteConfirmation,
  isValidProspectDeleteConfirmation,
  totalCascadeRecords
} from "@/modules/leads/cascade-delete";

describe(
  "lead cascade delete helpers",
  () => {
    it(
      "genera confirmacion fuerte con el codigo",
      () => {
        expect(
          buildProspectDeleteConfirmation(
            "BI-006"
          )
        ).toBe(
          "ELIMINAR BI-006"
        );
      }
    );

    it(
      "rechaza confirmaciones incompletas",
      () => {
        expect(
          isValidProspectDeleteConfirmation(
            "BI-006",
            "ELIMINAR"
          )
        ).toBe(false);

        expect(
          isValidProspectDeleteConfirmation(
            "BI-006",
            "ELIMINAR BI-006"
          )
        ).toBe(true);
      }
    );

    it(
      "cuenta los registros destructivos sin incluir auditoria preservada",
      () => {
        expect(
          totalCascadeRecords({
            contacts: 2,
            quotes: 1,
            quoteItems: 3,
            projects: 1,
            warranties: 1,
            conversations: 1,
            conversationSessions: 2,
            conversationMessages: 5,
            auditEventsPreserved: 7
          })
        ).toBe(17);
      }
    );
  }
);
