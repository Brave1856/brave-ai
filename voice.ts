import { createParser } from "eventsource-parser";

function encodeWav(chunks: readonly Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new ArrayBuffer(44 + length * 2);
  const view = new DataView(bytes);
  const tag = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, length * 2, true);
  let offset = 44;
  for (const chunk of chunks)
    for (const value of chunk) {
      const s = Math.max(-1, Math.min(1, value));
      view.setInt16(offset, s * (s < 0 ? 32768 : 32767), true);
      offset += 2;
    }
  return new Blob([bytes], { type: "audio/wav" });
}

export async function startRecording(): Promise<{ stop: () => Promise<File>; cancel: () => void }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const context = new AudioContext({ sampleRate: 16000 });
  await context.resume();
  const source = context.createMediaStreamSource(stream);
  const node = context.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  source.connect(node);
  node.connect(context.destination);

  const cleanup = () => {
    stream.getTracks().forEach((t) => t.stop());
    node.disconnect();
    source.disconnect();
    node.onaudioprocess = null;
    void context.close();
  };

  return {
    async stop() {
      const rate = context.sampleRate;
      cleanup();
      const blob = encodeWav(chunks, rate);
      if (blob.size < 4096) throw new Error("I didn't catch that — try holding a bit longer.");
      return new File([blob], "recording.wav", { type: "audio/wav" });
    },
    cancel: cleanup,
  };
}

export async function transcribe(file: File, token: string): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok || !res.body) {
    throw new Error((await res.text().catch(() => "")) || "Couldn't transcribe that.");
  }
  let text = "";
  let finalText: string | null = null;
  let failure: string | null = null;
  const parser = createParser({
    onEvent(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "transcript.text.delta") text += data.delta ?? "";
        else if (data.type === "transcript.text.done") finalText = data.text ?? text;
        else if (data.error) failure = data.error.message ?? "Transcription failed.";
      } catch {
        /* ignore non-JSON frames */
      }
    },
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value, { stream: true }));
  }
  if (failure) throw new Error(failure);
  return (finalText ?? text).trim();
}
