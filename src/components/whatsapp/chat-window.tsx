"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  CheckCircle2,
  RefreshCcw,
  SendHorizontal
} from "lucide-react";
import {
  buildCrmPayloadFromSession,
  createInitialConversationSession,
  createWelcomeReply,
  processConversationMessage
} from "@/lib/conversation-engine";
import {
  ChatMessage as ChatMessageType,
  ConversationSession
} from "@/types/conversation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CapturedDataPanel } from "@/components/whatsapp/captured-data-panel";
import { ChatMessage } from "@/components/whatsapp/chat-message";
import { ConversationStepBadge } from "@/components/whatsapp/conversation-step-badge";

function createMessage(
  role: ChatMessageType["role"],
  text: string
): ChatMessageType {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    timestamp: new Date().toISOString()
  };
}

function buildLegacyQualificationData(
  session: ConversationSession
) {
  const data = session.capturedData;

  return {
    projectLocation:
      data.projectLocation ?? "Por confirmar",
    spaceType: data.spaceType ?? "Otro",
    urgency: data.urgency ?? "Normal",
    solutionType:
      data.solutionType ?? "No estoy seguro",
    material:
      data.material ?? "Recomendar material",
    usage: data.usage ?? "No estoy seguro",
    installationMethod:
      data.installationMethod ?? "No se",
    quantity: data.quantity ?? "Por definir",
    evidence: data.evidence ?? "Sin archivo",
    estimatedAmount: 0
  };
}

export function ChatWindow() {
  const [session, setSession] =
    useState<ConversationSession>(() =>
      createInitialConversationSession()
    );
  const [
    conversationSessionId,
    setConversationSessionId
  ] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    ChatMessageType[]
  >(() => [
    createMessage(
      "assistant",
      createWelcomeReply()
    )
  ]);
  const [inputValue, setInputValue] = useState("");
  const [crmSent, setCrmSent] = useState(false);
  const [crmError, setCrmError] = useState<
    string | null
  >(null);
  const [quoteHref, setQuoteHref] =
    useState("/cotizador");
  const messageListRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!messageListRef.current) return;

    messageListRef.current.scrollTop =
      messageListRef.current.scrollHeight;
  }, [messages]);

  const completed = session.status === "completed";

  const conversationHint = useMemo(() => {
    if (session.status === "idle") {
      return "Escribe por ejemplo: quiero cotizar piso podotáctil para hospital";
    }

    if (session.status === "completed") {
      return "Datos completos. Envía el expediente al CRM para revisión humana.";
    }

    return "Responde el dato solicitado para avanzar al siguiente paso.";
  }, [session.status]);

  async function createBackendConversationSession() {
    const response = await fetch(
      "/api/conversations/start",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      }
    );

    if (!response.ok) {
      throw new Error(
        "No se pudo abrir sesión de conversación en backend."
      );
    }

    const created = (await response.json()) as {
      sessionId: string;
    };

    setConversationSessionId(created.sessionId);
  }

  async function startNewConversation() {
    setSession(createInitialConversationSession());
    setMessages([
      createMessage(
        "assistant",
        createWelcomeReply()
      )
    ]);
    setInputValue("");
    setCrmSent(false);
    setCrmError(null);
    setQuoteHref("/cotizador");

    try {
      await createBackendConversationSession();
    } catch {
      setConversationSessionId(null);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    const raw = inputValue.trim();

    if (!raw) return;

    const userMessage = createMessage("user", raw);
    const result =
      await processConversationMessage(
        session,
        raw
      );
    const botMessages = result.replies.map(
      (reply) =>
        createMessage("assistant", reply)
    );

    setSession(result.session);
    setMessages((current) => [
      ...current,
      userMessage,
      ...botMessages
    ]);
    setInputValue("");
    setCrmError(null);

    if (conversationSessionId) {
      await fetch(
        `/api/conversations/${conversationSessionId}/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userMessage,
            assistantMessages: botMessages,
            session: result.session
          })
        }
      ).catch(() => null);
    }
  }

  async function handleSendToCrm() {
    const payload =
      buildCrmPayloadFromSession(session);

    if (!payload) {
      setCrmError(
        "Completa el flujo antes de enviar al CRM."
      );
      return;
    }

    if (!conversationSessionId) {
      setCrmError(
        "No se pudo abrir la sesión backend para cerrar la conversación."
      );
      return;
    }

    try {
      const response = await fetch(
        `/api/conversations/${conversationSessionId}/close`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            leadData: {
              client: payload.prospect.client,
              contact: payload.prospect.contact,
              email: payload.prospect.email,
              phone: payload.prospect.phone,
              city: payload.prospect.city,
              projectType:
                payload.prospect.projectType,
              painPoint:
                payload.prospect.painPoint,
              estimatedValue: 0,
              nextAction:
                payload.prospect.nextAction,
              internalNotes:
                payload.prospect.internalNotes
            },
            quoteData:
              buildLegacyQualificationData(session)
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          "No se pudo cerrar la conversación en backend."
        );
      }

      const result = (await response.json()) as {
        lead: {
          client: string;
          contact: string;
          city: string;
          projectType: string;
          owner: string | null;
        };
        review: {
          status: "PENDING_HUMAN_REVIEW";
          quoteCreated: false;
          message: string;
        };
      };

      const params = new URLSearchParams({
        client: result.lead.client,
        contact: result.lead.contact,
        city: result.lead.city,
        projectType: result.lead.projectType
      });

      setQuoteHref(
        `/cotizador?${params.toString()}`
      );
      setCrmSent(true);
      setCrmError(null);
    } catch {
      setCrmError(
        "Ocurrió un error al enviar el expediente al CRM."
      );
    }
  }

  useEffect(() => {
    createBackendConversationSession().catch(
      () => setConversationSessionId(null)
    );
  }, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-brand-border">
        <CardHeader className="border-b border-brand-border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-brand-ink">
                Simulador de precalificación
              </CardTitle>
              <CardDescription>
                {conversationHint}
              </CardDescription>
            </div>
            <ConversationStepBadge
              session={session}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-6">
          <div
            ref={messageListRef}
            className="h-[52vh] overflow-y-auto rounded-2xl border border-brand-border bg-[#f7fafc] p-3 sm:h-[60vh]"
            role="log"
            aria-label="Conversación simulada de WhatsApp"
            aria-live="polite"
          >
            <div className="space-y-3">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                />
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-3"
            aria-label="Formulario de mensaje"
          >
            <Label htmlFor="chat-input">
              Mensaje
            </Label>
            <div className="flex gap-2">
              <Input
                id="chat-input"
                value={inputValue}
                onChange={(event) =>
                  setInputValue(
                    event.target.value
                  )
                }
                placeholder="Escribe tu mensaje..."
                aria-label="Mensaje para asistente de precalificación"
                autoComplete="off"
              />
              <Button
                type="submit"
                aria-label="Enviar mensaje"
              >
                <SendHorizontal
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                Enviar
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2 border-t border-brand-border pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={startNewConversation}
            >
              <RefreshCcw
                className="h-4 w-4"
                aria-hidden="true"
              />
              Nueva conversación
            </Button>
            <Button
              type="button"
              variant="accent"
              onClick={handleSendToCrm}
              disabled={!completed || crmSent}
            >
              Enviar expediente al CRM
            </Button>
          </div>

          {crmError ? (
            <p className="text-sm text-destructive">
              {crmError}
            </p>
          ) : null}

          {crmSent ? (
            <div
              className="rounded-2xl border border-[#3aaa35] bg-[#f2fbf1] p-4"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1d5f1a]">
                <CheckCircle2
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                Expediente registrado en el CRM.
              </div>
              <p className="mt-2 text-sm text-brand-ink">
                El prospecto quedó pendiente de
                revisión humana. No se creó ni se
                envió una cotización automática.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                >
                  <Link href="/prospectos">
                    Abrir prospectos
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={quoteHref}>
                    Preparar cotización como ejecutivo
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CapturedDataPanel session={session} />
    </div>
  );
}
