import {
  conversationSteps,
  quoteIntentKeywords
} from "@/modules/whatsapp/options";
import {
  ACKNOWLEDGEMENT_VARIANTS,
  POST_COMPLETION_HUMAN_VARIANTS,
  STARTER_VARIANTS,
  extractFirstName,
  pickVariant
} from "@/lib/conversation-copy";
import {
  ChoiceOption,
  ConversationCapturedData,
  ConversationCrmPayload,
  ConversationSession,
  ConversationStepDefinition,
  ConversationStepId,
  EngineProcessResult
} from "@/types/conversation";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mapChoiceValue(input: string, options: ChoiceOption[]) {
  const trimmed = input.trim();
  const numericMatch = trimmed.match(/^(?:opcion\s+|opción\s+)?(\d+)(?:\.|\))?$/i);

  if (numericMatch) {
    const index = parseInt(numericMatch[1], 10);

    if (index >= 1 && index <= options.length) {
      return options[index - 1].value;
    }
  }

  const normalizedInput = normalizeText(input);

  for (const option of options) {
    const candidates = [option.value, ...(option.aliases ?? [])];
    const matched = candidates.some((candidate) => {
      const normalizedCandidate = normalizeText(candidate);

      return (
        normalizedInput === normalizedCandidate ||
        normalizedInput.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedInput)
      );
    });

    if (matched) return option.value;
  }

  return null;
}

function getStepPrompt(step: ConversationStepDefinition) {
  if (!step.options || step.options.length === 0) return step.question;

  const emojiNumbers = [
    "1️⃣",
    "2️⃣",
    "3️⃣",
    "4️⃣",
    "5️⃣",
    "6️⃣",
    "7️⃣",
    "8️⃣",
    "9️⃣",
    "🔟"
  ];

  const optionList = step.options
    .map((option, idx) => {
      const marker = emojiNumbers[idx] ?? `${idx + 1}.`;
      return `${marker} ${option.value}`;
    })
    .join("\n");

  return `${step.question}\n\nResponde con el número de tu opción:\n${optionList}`;
}

function mapField(
  stepId: ConversationStepId,
  value: string
): ConversationCapturedData {
  return {
    [stepId]: value
  } as ConversationCapturedData;
}

/**
 * Se conserva para compatibilidad con demostraciones antiguas.
 * El flujo productivo ya no genera ni comunica folios de cotización.
 */
export function generateDemoFolio(sessionId: string, date = new Date()) {
  const year = date.getFullYear();
  const checksum = Array.from(sessionId).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );
  const sequential = String((checksum % 999) + 1).padStart(3, "0");

  return `BI-COT-${year}-${sequential}`;
}

export function createInitialConversationSession(): ConversationSession {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    status: "idle",
    startedAt: now,
    updatedAt: now,
    currentStepIndex: 0,
    capturedData: {},
    intentDetected: false
  };
}

export function createWelcomeReply() {
  return "¡Hola! 👋 Soy el asistente de Braille International. Puedo recopilar los datos de tu proyecto para que un ejecutivo revise la solicitud y prepare una cotización. Escribe \"quiero cotizar\" para comenzar.";
}

export function isQuoteIntent(message: string) {
  const normalizedMessage = normalizeText(message);

  return quoteIntentKeywords.some((keyword) =>
    normalizedMessage.includes(normalizeText(keyword))
  );
}

function classifyCompletedReply(
  message: string
): "needs_human" | "restarted" {
  return isQuoteIntent(message) ? "restarted" : "needs_human";
}

export async function processConversationMessage(
  session: ConversationSession,
  message: string,
  _estimateAmountFn?: (
    capturedData: ConversationCapturedData
  ) => Promise<number>
): Promise<EngineProcessResult> {
  const now = new Date().toISOString();
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return {
      session: {
        ...session,
        updatedAt: now
      },
      replies: [
        "Necesito que me escribas algo para poder ayudarte. ¿Me cuentas qué necesitas?"
      ]
    };
  }

  if (session.status === "idle") {
    if (!isQuoteIntent(trimmedMessage)) {
      return {
        session: {
          ...session,
          updatedAt: now
        },
        replies: [
          "Puedo registrar una solicitud de soluciones de accesibilidad y entregarla a un ejecutivo. Cuando quieras comenzar, escribe \"quiero cotizar\"."
        ]
      };
    }

    const firstStep = conversationSteps[0];

    return {
      session: {
        ...session,
        status: "collecting",
        intentDetected: true,
        updatedAt: now,
        currentStepIndex: 0
      },
      replies: [
        pickVariant(session.id, STARTER_VARIANTS),
        getStepPrompt(firstStep)
      ],
      stepPrompt: firstStep.question
    };
  }

  if (session.status === "completed") {
    const intent = classifyCompletedReply(trimmedMessage);

    if (intent === "restarted") {
      const firstStep = conversationSteps[0];

      return {
        session: {
          ...session,
          status: "collecting",
          intentDetected: true,
          currentStepIndex: 0,
          capturedData: {},
          folio: undefined,
          estimatedAmount: undefined,
          completedAt: undefined,
          updatedAt: now
        },
        replies: [
          "¡Con gusto! Registraré una solicitud nueva.",
          getStepPrompt(firstStep)
        ],
        stepPrompt: firstStep.question,
        postQuoteIntent: "restarted"
      };
    }

    return {
      session: {
        ...session,
        updatedAt: now
      },
      replies: [
        pickVariant(session.id, POST_COMPLETION_HUMAN_VARIANTS)
      ],
      postQuoteIntent: "needs_human"
    };
  }

  const currentStep = conversationSteps[session.currentStepIndex];

  if (!currentStep) {
    return {
      session: {
        ...session,
        updatedAt: now
      },
      replies: [
        "Se me perdió el hilo de la conversación. Escribe \"quiero cotizar\" para comenzar de nuevo."
      ]
    };
  }

  let capturedValue = trimmedMessage;

  if (currentStep.options && currentStep.options.length > 0) {
    const mapped = mapChoiceValue(trimmedMessage, currentStep.options);

    if (!mapped && !currentStep.freeText) {
      return {
        session: {
          ...session,
          updatedAt: now
        },
        replies: [
          "No identifiqué esa opción. Elige una de estas:",
          getStepPrompt(currentStep)
        ]
      };
    }

    capturedValue = mapped ?? trimmedMessage;
  }

  const updatedData = {
    ...session.capturedData,
    ...mapField(currentStep.id, capturedValue)
  };
  const nextStepIndex = session.currentStepIndex + 1;
  const nextStep = conversationSteps[nextStepIndex];

  if (!nextStep) {
    const firstName = extractFirstName(updatedData.contactName);
    const closingGreeting = firstName
      ? `¡Listo, ${firstName}! Ya tengo los datos necesarios para registrar tu solicitud.`
      : "¡Listo! Ya tengo los datos necesarios para registrar tu solicitud.";

    return {
      session: {
        ...session,
        status: "completed",
        updatedAt: now,
        completedAt: now,
        currentStepIndex: session.currentStepIndex,
        capturedData: updatedData,
        folio: undefined,
        estimatedAmount: undefined
      },
      replies: [
        closingGreeting,
        "Tu expediente será revisado por un ejecutivo de Braille International.",
        "La cotización se preparará y enviará únicamente después de la revisión humana; no se genera de forma automática."
      ]
    };
  }

  const acknowledgement =
    currentStep.id === "contactName"
      ? (() => {
          const firstName = extractFirstName(capturedValue);
          return firstName ? `Mucho gusto, ${firstName}.` : "Mucho gusto.";
        })()
      : pickVariant(
          `${session.id}${currentStep.id}`,
          ACKNOWLEDGEMENT_VARIANTS
        );

  return {
    session: {
      ...session,
      status: "collecting",
      updatedAt: now,
      currentStepIndex: nextStepIndex,
      capturedData: updatedData
    },
    replies: [
      acknowledgement,
      getStepPrompt(nextStep)
    ],
    stepPrompt: nextStep.question
  };
}

export function getCurrentStep(session: ConversationSession) {
  if (session.status !== "collecting") return null;

  return conversationSteps[session.currentStepIndex] ?? null;
}

export const FALLBACK_CONTACT_EMAIL = "contacto-whatsapp@demo.mx";
export const FALLBACK_CONTACT_PHONE = "+52 55 0000 0000";

function sanitizeCapturedEmail(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed && trimmed.includes("@")
    ? trimmed
    : FALLBACK_CONTACT_EMAIL;
}

function sanitizeCapturedPhone(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  const digits = trimmed.replace(/[^\d]/g, "");

  return digits.length >= 8
    ? trimmed
    : FALLBACK_CONTACT_PHONE;
}

export function buildCrmPayloadFromSession(
  session: ConversationSession
): ConversationCrmPayload | null {
  if (session.status !== "completed") return null;

  const data = session.capturedData;
  const solution = data.solutionType ?? "No estoy seguro";

  const requirements = [
    `Ubicación del proyecto: ${data.projectLocation ?? "Por confirmar"}`,
    `Tipo de espacio: ${data.spaceType ?? "Otro"}`,
    `Urgencia: ${data.urgency ?? "Normal"}`,
    `Solución de interés: ${solution}`,
    `Material: ${data.material ?? "Por recomendar"}`,
    `Uso: ${data.usage ?? "Por confirmar"}`,
    `Método de instalación: ${data.installationMethod ?? "Por definir"}`,
    `Cantidad o metraje: ${data.quantity ?? "Por definir"}`,
    `Evidencia: ${data.evidence ?? "Sin archivo"}`,
    "Estado: PENDING_HUMAN_REVIEW",
    "Cotización automática: NO"
  ].join("\n");

  return {
    prospect: {
      client: data.clientCompany ?? "Cliente WhatsApp",
      contact: data.contactName ?? "Contacto pendiente",
      email: sanitizeCapturedEmail(data.contactEmail),
      phone: sanitizeCapturedPhone(data.contactPhone),
      city: data.city ?? "Sin ciudad",
      projectType: solution,
      source: "WhatsApp",
      estimatedValue: 0,
      painPoint: `Proyecto en ${data.projectLocation ?? "ubicación por confirmar"} con necesidad de ${solution.toLowerCase()}.`,
      interestedSolutions: [solution],
      internalNotes: requirements,
      nextAction:
        "Revisar expediente, validar requisitos técnicos y preparar cotización humana."
    }
  };
}
