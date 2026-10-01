"use client";

import {
  useEffect,
  useSyncExternalStore
} from "react";
import {
  leadSchema,
  LeadDto
} from "@/modules/crm/contracts";
import { createLeadFromConversationPayload } from "@/modules/whatsapp/mappers";
import { ConversationCrmPayload } from "@/types/conversation";

/**
 * Compatibilidad temporal con el cotizador anterior.
 * La colección permanece vacía: el bot ya no crea precotizaciones,
 * folios, precios ni documentos automáticamente.
 */
type LegacyPreliminaryQuote = {
  folio: string;
  client: string;
  contact: string;
  city: string;
  projectLocation: string;
  spaceType: string;
  urgency: string;
  solutionType: string;
  material: string;
  usage: string;
  installationMethod: string;
  quantity: string;
  evidence: string;
  estimatedAmount: number;
};

type DemoSessionState = {
  prospects: LeadDto[];
  preliminaryQuotes: LegacyPreliminaryQuote[];
};

const storageKey =
  "bi-design-crm-session-v2";

let storeState: DemoSessionState = {
  prospects: [],
  preliminaryQuotes: []
};

let hydrated = false;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function saveState() {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    storageKey,
    JSON.stringify(storeState)
  );
}

function hydrateState() {
  if (
    typeof window === "undefined" ||
    hydrated
  ) {
    return;
  }

  hydrated = true;

  try {
    const raw =
      window.sessionStorage.getItem(storageKey);

    if (!raw) return;

    const parsed = JSON.parse(
      raw
    ) as Partial<DemoSessionState>;

    storeState = {
      prospects: Array.isArray(parsed.prospects)
        ? parsed.prospects
        : [],
      // No se recuperan precotizaciones antiguas: el flujo actual exige
      // revisión humana antes de preparar cualquier cotización.
      preliminaryQuotes: []
    };
  } catch {
    storeState = {
      prospects: [],
      preliminaryQuotes: []
    };
  }
}

function getSnapshot() {
  return storeState;
}

function getServerSnapshot(): DemoSessionState {
  return {
    prospects: [],
    preliminaryQuotes: []
  };
}

function nextProspectId() {
  const total =
    storeState.prospects.length + 1;

  return `BI-WA-${String(total).padStart(
    3,
    "0"
  )}`;
}

function createProspectFromPayload(
  payload: ConversationCrmPayload
): LeadDto {
  const draft =
    createLeadFromConversationPayload(payload);
  const id = nextProspectId();

  return leadSchema.parse({
    ...draft,
    id,
    activities: draft.activities.map(
      (activity, index) => ({
        ...activity,
        id: `${id}-A${index + 1}`
      })
    )
  });
}

/**
 * Compatibilidad para demostraciones sin backend.
 * Solo agrega el prospecto; ya no crea cotizaciones preliminares.
 */
export function addConversationToDemoSession(
  payload: ConversationCrmPayload
) {
  hydrateState();

  const prospect =
    createProspectFromPayload(payload);

  storeState = {
    prospects: [
      prospect,
      ...storeState.prospects
    ],
    preliminaryQuotes: []
  };

  saveState();
  emitChange();

  return {
    prospect
  };
}

export function useDemoSessionStore() {
  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    hydrateState();
    emitChange();
  }, []);

  return state;
}
