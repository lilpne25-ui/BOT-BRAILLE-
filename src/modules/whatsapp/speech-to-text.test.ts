import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { transcribeAudio } from "@/modules/whatsapp/speech-to-text";

const ORIGINAL_ENV = { ...process.env };

describe("transcribeAudio", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, OPENAI_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("devuelve el texto transcrito cuando la API responde ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "Hola, quiero pedir informacion." })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeAudio(Buffer.from("fake-audio-bytes"), "audio/ogg; codecs=opus");

    expect(result).toBe("Hola, quiero pedir informacion.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(init.headers.Authorization).toBe("Bearer test-key");
  });

  it("devuelve null sin llamar a fetch si falta OPENAI_API_KEY", async () => {
    delete process.env.OPENAI_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeAudio(Buffer.from("fake-audio-bytes"), "audio/ogg");

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve null si la API responde con error http", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeAudio(Buffer.from("fake-audio-bytes"), "audio/ogg");

    expect(result).toBeNull();
  });

  it("devuelve null si la transcripcion viene vacia (audio de ruido/silencio)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "   " })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeAudio(Buffer.from("fake-audio-bytes"), "audio/ogg");

    expect(result).toBeNull();
  });

  it("devuelve null si fetch lanza una excepcion de red", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeAudio(Buffer.from("fake-audio-bytes"), "audio/ogg");

    expect(result).toBeNull();
  });

  it("devuelve null si el buffer esta vacio", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeAudio(Buffer.alloc(0), "audio/ogg");

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
