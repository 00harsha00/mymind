import { useState, useRef, useCallback } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export type VoiceState = "idle" | "recording" | "processing" | "done" | "error";

export function useVoice(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("processing");
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const form = new FormData();
        form.append("audio", blob, `recording.${ext}`);
        try {
          const res = await fetch(`${BACKEND}/voice`, { method: "POST", body: form });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || "Transcription failed");
          onTranscript(data.transcript);
          setState("idle");
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Transcription failed");
          setState("error");
        }
      };

      mediaRecorderRef.current = mr;
      mr.start(250);
      setState("recording");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Microphone access denied");
      setState("error");
    }
  }, [onTranscript]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setState("idle");
    setError("");
  }, []);

  return { state, error, start, stop, cancel };
}
