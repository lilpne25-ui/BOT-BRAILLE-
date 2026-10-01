import { ChatMessage as ChatMessageType } from "@/types/conversation";
import { cn } from "@/lib/utils";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";
  const time = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(message.timestamp));

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <article
        className={cn(
          "max-w-[88%] rounded-2xl border px-4 py-3 text-sm shadow-sm sm:max-w-[75%]",
          isUser ? "border-[#005eaa] bg-[#005eaa] text-white" : "border-brand-border bg-white text-brand-ink"
        )}
        aria-label={isUser ? "Mensaje del usuario" : "Mensaje del asistente"}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
        <p className={cn("mt-2 text-right text-[11px]", isUser ? "text-white/85" : "text-muted-foreground")}>{time}</p>
      </article>
    </div>
  );
}
