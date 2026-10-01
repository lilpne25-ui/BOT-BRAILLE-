import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import QRCode from "qrcode";
import pino from "pino";
import type { WASocket } from "@whiskeysockets/baileys";
import { processInboundWhatsAppMessage } from "@/modules/whatsapp/webhook-processor";
import { NormalizedInboundMessage, OutboundDocument, OutboundMessage } from "@/modules/whatsapp/integration-types";
import { transcribeAudio } from "@/modules/whatsapp/speech-to-text";

// Avoid optional native ws addons that can fail in some Windows/Node setups.
process.env.WS_NO_BUFFER_UTIL = process.env.WS_NO_BUFFER_UTIL ?? "1";
process.env.WS_NO_UTF_8_VALIDATE = process.env.WS_NO_UTF_8_VALIDATE ?? "1";

type BaileysConnectionStatus = "disconnected" | "connecting" | "qr_pending" | "connected" | "error";

type BaileysLogEntry = {
  at: string;
  level: "info" | "warn" | "error";
  event: string;
  pid: number;
  details?: Record<string, unknown>;
};

type BaileysRuntime = {
  socket: WASocket | null;
  status: BaileysConnectionStatus;
  qr: string | null;
  qrDataUrl: string | null;
  lastError: string | null;
  lastDisconnectCode: number | null;
  lastDisconnectReason: string | null;
  connectAttempts: number;
  qrGenerations: number;
  credsUpdateCount: number;
  logs: BaileysLogEntry[];
  reconnectAttempt: number;
  connectingPromise: Promise<void> | null;
};

type GlobalWithBaileys = typeof globalThis & {
  __baileysRuntime?: BaileysRuntime;
};

type ConnectBaileysOptions = {
  force?: boolean;
  reason?: string;
};

function getAuthDir() {
  const configured = process.env.WHATSAPP_BAILEYS_AUTH_DIR?.trim();
  if (configured) {
    return path.resolve(process.cwd(), configured);
  }
  return path.resolve(process.cwd(), ".wa-auth");
}

function getLogsDir() {
  const configured = process.env.WHATSAPP_BAILEYS_LOG_DIR?.trim();
  if (configured) return path.resolve(process.cwd(), configured);
  return path.resolve(process.cwd(), ".wa-logs");
}

function getLogsFile() {
  return path.join(getLogsDir(), "baileys.ndjson");
}

function clearAuthDir() {
  const authDir = getAuthDir();
  try {
    fs.rmSync(authDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

function ensureLogFile() {
  const logDir = getLogsDir();
  fs.mkdirSync(logDir, { recursive: true });
  const file = getLogsFile();
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "");
  }
}

function toJsonLine(value: unknown) {
  return `${JSON.stringify(value, (_key, nested) => {
    if (nested instanceof Error) {
      return {
        name: nested.name,
        message: nested.message,
        stack: nested.stack
      };
    }
    if (typeof nested === "bigint") return Number(nested);
    return nested;
  })}\n`;
}

function parseLogFile(limit = 200): BaileysLogEntry[] {
  try {
    ensureLogFile();
    const raw = fs.readFileSync(getLogsFile(), "utf8");
    if (!raw.trim()) return [];
    const rows = raw
      .trim()
      .split("\n")
      .slice(-Math.max(1, Math.min(limit, 1000)))
      .map((line) => {
        try {
          return JSON.parse(line) as BaileysLogEntry;
        } catch {
          return null;
        }
      })
      .filter((row): row is BaileysLogEntry => Boolean(row));
    return rows;
  } catch {
    return [];
  }
}

function getRuntime() {
  const globalRuntime = globalThis as GlobalWithBaileys;
  if (!globalRuntime.__baileysRuntime) {
    globalRuntime.__baileysRuntime = {
      socket: null,
      status: "disconnected",
      qr: null,
      qrDataUrl: null,
      lastError: null,
      lastDisconnectCode: null,
      lastDisconnectReason: null,
      connectAttempts: 0,
      qrGenerations: 0,
      credsUpdateCount: 0,
      logs: [],
      reconnectAttempt: 0,
      connectingPromise: null
    };
  }
  const runtime = globalRuntime.__baileysRuntime;
  if (typeof runtime.lastDisconnectCode !== "number" && runtime.lastDisconnectCode !== null) runtime.lastDisconnectCode = null;
  if (typeof runtime.lastDisconnectReason !== "string" && runtime.lastDisconnectReason !== null) runtime.lastDisconnectReason = null;
  if (!Number.isFinite(runtime.connectAttempts)) runtime.connectAttempts = 0;
  if (!Number.isFinite(runtime.qrGenerations)) runtime.qrGenerations = 0;
  if (!Number.isFinite(runtime.credsUpdateCount)) runtime.credsUpdateCount = 0;
  if (!Array.isArray(runtime.logs)) runtime.logs = [];
  return runtime;
}

function appendLog(level: BaileysLogEntry["level"], event: string, details?: Record<string, unknown>) {
  const runtime = getRuntime();
  const entry: BaileysLogEntry = {
    at: new Date().toISOString(),
    level,
    event,
    pid: process.pid,
    details
  };
  runtime.logs.push(entry);
  if (runtime.logs.length > 300) {
    runtime.logs = runtime.logs.slice(-300);
  }
  try {
    ensureLogFile();
    fs.appendFileSync(getLogsFile(), toJsonLine(entry), "utf8");
  } catch (error) {
    console.error("Baileys log append failed", error);
  }
}

function toPhoneFromJid(jid: string) {
  const trimmed = jid.trim();
  if (!trimmed) return trimmed;
  if (trimmed.endsWith("@s.whatsapp.net")) {
    return trimmed.split("@")[0] ?? trimmed;
  }
  return trimmed;
}

function toJidFromPhone(phone: string) {
  const raw = phone.trim();
  if (!raw) return raw;
  if (raw.includes("@")) return raw;
  const withoutPrefix = raw.replace(/^whatsapp:/i, "");
  if (withoutPrefix.includes("@")) return withoutPrefix;
  const cleaned = withoutPrefix.replace(/[^\d]/g, "");
  return cleaned ? `${cleaned}@s.whatsapp.net` : withoutPrefix;
}

function detectMessageText(message: any): string {
  if (!message || typeof message !== "object") return "";
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    message.buttonsResponseMessage?.selectedDisplayText ??
    message.listResponseMessage?.title ??
    ""
  );
}

function detectMessageType(message: any): string {
  if (!message || typeof message !== "object") return "unknown";
  const [type] = Object.keys(message);
  return type ?? "unknown";
}

async function bootSocket() {
  const runtime = getRuntime();
  const authDir = getAuthDir();
  fs.mkdirSync(authDir, { recursive: true });
  appendLog("info", "socket.boot.start", { authDir });

  const baileysModule = await import("@whiskeysockets/baileys");
  const { default: makeWASocket, DisconnectReason } = baileysModule;
  const createAuthState = baileysModule.useMultiFileAuthState;
  const { state, saveCreds } = await createAuthState(authDir);
  appendLog("info", "socket.auth.loaded");

  runtime.status = "connecting";
  runtime.qr = null;
  runtime.qrDataUrl = null;
  runtime.lastError = null;

  const socket = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Braille CRM", "Chrome", "1.0.0"]
  });

  runtime.socket = socket;
  socket.ev.on("creds.update", (payload) => {
    runtime.credsUpdateCount += 1;
    appendLog("info", "creds.update", {
      count: runtime.credsUpdateCount,
      hasMe: Boolean((payload as any)?.me)
    });
    void saveCreds();
  });

  socket.ev.on("connection.update", async (update) => {
    const reasonCode = (update.lastDisconnect?.error as any)?.output?.statusCode as number | undefined;
    const reasonText = (update.lastDisconnect?.error as Error | undefined)?.message ?? null;
    appendLog("info", "connection.update", {
      connection: update.connection ?? null,
      hasQr: Boolean(update.qr),
      isNewLogin: Boolean(update.isNewLogin),
      reasonCode: reasonCode ?? null,
      reasonText
    });

    if (update.qr) {
      runtime.qr = update.qr;
      runtime.qrDataUrl = await QRCode.toDataURL(update.qr, { margin: 1, width: 280 });
      runtime.status = "qr_pending";
      runtime.qrGenerations += 1;
      appendLog("info", "qr.generated", { qrGenerations: runtime.qrGenerations });
    }

    if (update.connection === "open") {
      runtime.status = "connected";
      runtime.lastError = null;
      runtime.lastDisconnectCode = null;
      runtime.lastDisconnectReason = null;
      runtime.qr = null;
      runtime.qrDataUrl = null;
      runtime.reconnectAttempt = 0;
      appendLog("info", "connection.open");
    }

    if (update.connection === "close") {
      runtime.socket = null;
      const closeReasonText = reasonText ?? "Conexion cerrada.";
      runtime.lastDisconnectCode = reasonCode ?? null;
      runtime.lastDisconnectReason = closeReasonText;
      appendLog("warn", "connection.close", {
        reasonCode: reasonCode ?? null,
        reasonText: closeReasonText
      });

      if (reasonCode === DisconnectReason.loggedOut && runtime.reconnectAttempt < 1) {
        runtime.reconnectAttempt += 1;
        runtime.status = "disconnected";
        runtime.lastError = "Sesion invalida detectada. Regenerando QR limpio...";
        appendLog("warn", "connection.logged_out.auto_reset", { reconnectAttempt: runtime.reconnectAttempt });
        clearAuthDir();
        void connectBaileys({ force: true, reason: "logged_out_auto_reset" });
        return;
      }

      if (reasonCode === DisconnectReason.restartRequired && runtime.reconnectAttempt < 5) {
        runtime.reconnectAttempt += 1;
        runtime.status = "disconnected";
        runtime.lastError = "Conexion reiniciada por WhatsApp. Reintentando...";
        appendLog("info", "connection.restart_required", {
          reconnectAttempt: runtime.reconnectAttempt
        });
        void connectBaileys({ force: true, reason: "restart_required" });
        return;
      }

      if (reasonCode === DisconnectReason.loggedOut) {
        runtime.status = "disconnected";
        runtime.lastError = "Sesion cerrada en WhatsApp. Escanea nuevamente.";
        appendLog("warn", "connection.logged_out");
      } else {
        runtime.status = "error";
        runtime.lastError = closeReasonText;
        appendLog("error", "connection.error", { reasonCode: reasonCode ?? null, reasonText: closeReasonText });
      }
    }
  });

  socket.ev.on("messages.upsert", async (payload) => {
    appendLog("info", "messages.upsert", {
      type: payload.type,
      count: payload.messages?.length ?? 0
    });
    for (const row of payload.messages ?? []) {
      const remoteJid = row.key?.remoteJid ?? "";
      if (!remoteJid || row.key?.fromMe) continue;
      if (remoteJid.endsWith("@g.us")) continue;

      let text = detectMessageText(row.message);
      let transcribedFromAudio = false;

      const keyAny = row.key as any;
      const preferredDmJid =
        (typeof keyAny?.remoteJidAlt === "string" && keyAny.remoteJidAlt) ||
        (typeof keyAny?.senderPn === "string" && keyAny.senderPn) ||
        (typeof keyAny?.participantPn === "string" && keyAny.participantPn) ||
        remoteJid;

      const audioMessage = (row.message as any)?.audioMessage;
      if (!text.trim() && audioMessage) {
        appendLog("info", "audio.detected", {
          remoteJid,
          ptt: Boolean(audioMessage.ptt),
          mimetype: audioMessage.mimetype ?? null,
          seconds: audioMessage.seconds ?? null
        });

        try {
          const audioBuffer = (await baileysModule.downloadMediaMessage(
            row,
            "buffer",
            {},
            { logger: pino({ level: "silent" }), reuploadRequest: socket.updateMediaMessage }
          )) as Buffer;

          const transcription = await transcribeAudio(audioBuffer, audioMessage.mimetype ?? "audio/ogg");

          if (transcription) {
            text = transcription;
            transcribedFromAudio = true;
            appendLog("info", "audio.transcribe.success", { remoteJid, length: transcription.length });
          } else {
            appendLog("warn", "audio.transcribe.empty_or_failed", { remoteJid });
          }
        } catch (error) {
          appendLog("error", "audio.download_or_transcribe.error", {
            remoteJid,
            message: error instanceof Error ? error.message : "Unknown audio processing error"
          });
        }

        if (!text.trim()) {
          try {
            await sendBaileysReply({
              to: toPhoneFromJid(preferredDmJid),
              text: "No pude escuchar tu nota de voz. ¿Puedes escribir tu mensaje, por favor?"
            });
            appendLog("info", "audio.transcribe.fallback_sent", { remoteJid });
          } catch (error) {
            appendLog("error", "audio.transcribe.fallback_send_error", {
              remoteJid,
              message: error instanceof Error ? error.message : "Unknown send error"
            });
          }
          continue;
        }
      }

      if (!text.trim()) continue;

      appendLog("info", "message.normalized_target", {
        remoteJid,
        remoteJidAlt: keyAny?.remoteJidAlt ?? null,
        senderPn: keyAny?.senderPn ?? null,
        participantPn: keyAny?.participantPn ?? null,
        preferredDmJid
      });

      const normalized: NormalizedInboundMessage = {
        phone: toPhoneFromJid(preferredDmJid),
        name: row.pushName ?? undefined,
        messageText: text,
        messageType: detectMessageType(row.message),
        timestamp: row.messageTimestamp ? new Date(Number(row.messageTimestamp) * 1000).toISOString() : new Date().toISOString(),
        providerMessageId: row.key?.id ?? crypto.randomUUID(),
        rawPayload: row,
        transcribedFromAudio: transcribedFromAudio || undefined
      };

      try {
        await processInboundWhatsAppMessage(normalized);
      } catch (error) {
        console.error("Baileys inbound processing error", error);
        appendLog("error", "message.process.error", {
          message: error instanceof Error ? error.message : "Unknown processing error"
        });
      }
    }
  });
}

export async function connectBaileys(options?: ConnectBaileysOptions) {
  const runtime = getRuntime();
  const force = Boolean(options?.force);
  runtime.connectAttempts += 1;
  appendLog("info", "connect.requested", {
    attempt: runtime.connectAttempts,
    status: runtime.status,
    lastError: runtime.lastError,
    force,
    reason: options?.reason ?? null
  });
  if (runtime.status === "disconnected" && runtime.lastError?.includes("Sesion cerrada")) {
    appendLog("warn", "connect.clearing_auth_due_to_logged_out");
    clearAuthDir();
  }
  if (!force && (runtime.status === "connected" || runtime.status === "connecting" || runtime.status === "qr_pending")) {
    appendLog("info", "connect.skipped_already_active", { status: runtime.status });
    return getBaileysStatus();
  }

  if (force) {
    runtime.socket = null;
    runtime.status = "disconnected";
    runtime.qr = null;
    runtime.qrDataUrl = null;
    runtime.connectingPromise = null;
    appendLog("info", "connect.force_reboot", {
      reason: options?.reason ?? null
    });
  }

  if (!runtime.connectingPromise) {
    runtime.connectingPromise = bootSocket()
      .catch((error) => {
        runtime.status = "error";
        runtime.lastError = error instanceof Error ? error.message : "No fue posible iniciar Baileys.";
        runtime.socket = null;
        appendLog("error", "connect.boot_error", { message: runtime.lastError });
      })
      .finally(() => {
        runtime.connectingPromise = null;
      });
  }

  await runtime.connectingPromise;
  return getBaileysStatus();
}

export function getBaileysStatus() {
  const runtime = getRuntime();
  const authDir = getAuthDir();
  const authDirExists = fs.existsSync(authDir);
  const authFiles = authDirExists ? fs.readdirSync(authDir).slice(0, 8) : [];
  return {
    status: runtime.status,
    qrDataUrl: runtime.qrDataUrl,
    qr: runtime.qr,
    hasQr: Boolean(runtime.qrDataUrl),
    connected: runtime.status === "connected",
    lastError: runtime.lastError,
    diagnostics: {
      pid: process.pid,
      connectAttempts: runtime.connectAttempts,
      qrGenerations: runtime.qrGenerations,
      credsUpdateCount: runtime.credsUpdateCount,
      reconnectAttempt: runtime.reconnectAttempt,
      lastDisconnectCode: runtime.lastDisconnectCode,
      lastDisconnectReason: runtime.lastDisconnectReason,
      authDir,
      authDirExists,
      authFiles
    }
  };
}

export function disconnectBaileys() {
  const runtime = getRuntime();
  try {
    runtime.socket?.ws.close();
  } catch {
    // ignore close errors
  }
  runtime.socket = null;
  runtime.status = "disconnected";
  runtime.qr = null;
  runtime.qrDataUrl = null;
  runtime.lastError = null;
  runtime.lastDisconnectCode = null;
  runtime.lastDisconnectReason = null;
  runtime.reconnectAttempt = 0;
  appendLog("info", "disconnect.manual");

  return getBaileysStatus();
}

export function resetBaileysSession() {
  appendLog("warn", "session.reset.manual");
  disconnectBaileys();
  clearAuthDir();
  return getBaileysStatus();
}

export function getBaileysLogs() {
  const fileLogs = parseLogFile(300);
  if (fileLogs.length > 0) return fileLogs.slice(-200);
  const runtime = getRuntime();
  return runtime.logs.slice(-200);
}

export function clearBaileysLogs() {
  const runtime = getRuntime();
  runtime.logs = [];
  try {
    ensureLogFile();
    fs.writeFileSync(getLogsFile(), "", "utf8");
  } catch {
    // no-op
  }
  appendLog("info", "logs.cleared");
  return getBaileysLogs();
}

export async function sendBaileysReply(outbound: OutboundMessage) {
  const runtime = getRuntime();
  if (runtime.status !== "connected" || !runtime.socket) {
    appendLog("error", "send.blocked.not_connected");
    throw new Error("Baileys no esta conectado. Escanea el QR en /whatsapp.");
  }

  const jid = toJidFromPhone(outbound.to);
  const sent = await runtime.socket.sendMessage(jid, { text: outbound.text });
  appendLog("info", "send.success", { to: outbound.to });
  return {
    provider: "baileys",
    id: sent?.key?.id ?? `baileys-${Date.now()}`,
    to: outbound.to
  };
}

export async function sendBaileysDocument(outbound: OutboundDocument) {
  const runtime = getRuntime();
  if (runtime.status !== "connected" || !runtime.socket) {
    appendLog("error", "send.document.blocked.not_connected");
    throw new Error("Baileys no esta conectado. Escanea el QR en /whatsapp.");
  }

  const jid = toJidFromPhone(outbound.to);
  const sent = await runtime.socket.sendMessage(jid, {
    document: outbound.data,
    mimetype: outbound.mimeType,
    fileName: outbound.fileName,
    caption: outbound.caption
  });
  appendLog("info", "send.document.success", {
    to: outbound.to,
    fileName: outbound.fileName,
    mimeType: outbound.mimeType
  });
  return {
    provider: "baileys",
    id: sent?.key?.id ?? `baileys-doc-${Date.now()}`,
    to: outbound.to
  };
}
