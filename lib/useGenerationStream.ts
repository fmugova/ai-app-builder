// lib/useGenerationStream.ts
// Client hook that handles SSE connection, auto-reconnect, and Vercel timeout recovery
//
// Why this is needed:
// - Vercel kills SSE connections after 60s (Hobby) or 300s (Pro) even with Edge runtime
// - This hook saves the generation token and reconnects if the connection drops
// - On reconnect, the server replays already-completed files from KV store
// - The UI continues seamlessly without restarting generation

import { useCallback, useEffect, useRef, useState } from "react";
import type { GenerationPlan } from "@/lib/api/planGeneration";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GenerationPhase =
  | "idle"
  | "planning"
  | "planned"
  | "executing"
  | "done"
  | "error";

export interface GenerationState {
  phase: GenerationPhase;
  plan: GenerationPlan | null;
  currentStepId: string | null;
  completedSteps: Set<string>;
  files: Record<string, string>;
  qualityScore: number | null;
  error: string | null;
  token: string | null;
  reconnectCount: number;
  elapsedMs: number;
}

interface UseGenerationStreamOptions {
  prompt: string;
  siteName: string;
  apiUrl?: string;
  onComplete?: (files: Record<string, string>, score: number) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RECONNECT_ATTEMPTS = 4;
const RECONNECT_DELAY_MS = [1000, 2000, 4000, 8000]; // exponential backoff
const API_URL = "/api/generate/stream";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGenerationStream({
  prompt,
  siteName,
  apiUrl = API_URL,
  onComplete,
}: UseGenerationStreamOptions) {
  const [state, setState] = useState<GenerationState>({
    phase: "idle",
    plan: null,
    currentStepId: null,
    completedSteps: new Set(),
    files: {},
    qualityScore: null,
    error: null,
    token: null,
    reconnectCount: 0,
    elapsedMs: 0,
  });

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(null);
  const reconnectCountRef = useRef(0);
  const isStoppedRef = useRef(false);

  // ── Elapsed timer ────────────────────────────────────────────────────────
  function startElapsedTimer() {
    startTimeRef.current = Date.now();
    clearInterval(elapsedTimerRef.current!);
    elapsedTimerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, elapsedMs: Date.now() - startTimeRef.current }));
    }, 200);
  }

  function stopElapsedTimer() {
    clearInterval(elapsedTimerRef.current!);
  }

  // ── Connect/reconnect ────────────────────────────────────────────────────
  const connect = useCallback(
    async (isReconnect = false) => {
      if (isStoppedRef.current) return;

      // On the initial attempt, verify the session is still valid before
      // opening EventSource. EventSource doesn't expose HTTP status codes in
      // its onerror callback — a 401 looks identical to a network drop and
      // triggers up to MAX_RECONNECT_ATTEMPTS needless retries.
      if (!isReconnect) {
        try {
          const sessionRes = await fetch("/api/auth/session");
          const session = (await sessionRes.json()) as { user?: unknown } | null;
          if (!session?.user) {
            setState((prev) => ({
              ...prev,
              phase: "error",
              error: "Your session has expired — redirecting to sign in…",
            }));
            setTimeout(() => {
              window.location.href =
                "/auth/signin?callbackUrl=" + encodeURIComponent("/chatbuilder");
            }, 1500);
            return;
          }
        } catch {
          // Network error during preflight — proceed and let EventSource handle it
        }
      }

      const params = new URLSearchParams({ prompt, name: siteName });
      if (isReconnect && tokenRef.current) {
        params.set("token", tokenRef.current);
      }
      const url = `${apiUrl}?${params.toString()}`;

      setState((prev) => ({
        ...prev,
        phase: isReconnect ? prev.phase : "planning",
        error: null,
      }));

      const es = new EventSource(url);
      esRef.current = es;

      // ── Event handlers ─────────────────────────────────────────────────

      es.addEventListener("token", (e) => {
        const { token } = JSON.parse((e as MessageEvent).data);
        tokenRef.current = token;
        try { sessionStorage.setItem("bf_gen_token", token); } catch {}
        setState((prev) => ({ ...prev, token }));
      });

      es.addEventListener("reconnected", (e) => {
        const { completedSteps } = JSON.parse((e as MessageEvent).data);
        setState((prev) => ({
          ...prev,
          completedSteps: new Set([...prev.completedSteps, ...completedSteps]),
        }));
      });

      es.addEventListener("plan", (e) => {
        const plan: GenerationPlan = JSON.parse((e as MessageEvent).data);
        setState((prev) => ({
          ...prev,
          phase: "executing",
          plan,
        }));
        if (!isReconnect) startElapsedTimer();
      });

      es.addEventListener("step_start", (e) => {
        const { stepId } = JSON.parse((e as MessageEvent).data);
        setState((prev) => ({ ...prev, currentStepId: stepId }));
      });

      es.addEventListener("step_done", (e) => {
        const { stepId } = JSON.parse((e as MessageEvent).data);
        setState((prev) => {
          const next = new Set(prev.completedSteps);
          next.add(stepId);
          return { ...prev, completedSteps: next, currentStepId: null };
        });
      });

      es.addEventListener("file", (e) => {
        const { path, content } = JSON.parse((e as MessageEvent).data);
        setState((prev) => ({
          ...prev,
          files: { ...prev.files, [path]: content },
        }));
      });

      es.addEventListener("quality", (e) => {
        const { score } = JSON.parse((e as MessageEvent).data);
        setState((prev) => ({ ...prev, qualityScore: score }));
      });

      es.addEventListener("done", (e) => {
        const data = JSON.parse((e as MessageEvent).data);
        setState((prev) => ({
          ...prev,
          phase: "done",
          files: data.files ?? prev.files,
          qualityScore: data.qualityScore ?? prev.qualityScore,
          currentStepId: null,
        }));
        stopElapsedTimer();
        es.close();
        try { sessionStorage.removeItem("bf_gen_token"); } catch {}
        onComplete?.(data.files, data.qualityScore);
      });

      es.addEventListener("error_event", (e) => {
        const { message } = JSON.parse((e as MessageEvent).data);
        setState((prev) => ({ ...prev, phase: "error", error: message }));
        stopElapsedTimer();
        es.close();
      });

      // Connection error (network drop, Vercel timeout, etc.)
      es.onerror = () => {
        if (isStoppedRef.current) return;
        es.close();

        // Read phase from state snapshot via a ref so we don't schedule
        // side-effects (setTimeout) inside a setState updater, which can
        // fire multiple times in React StrictMode.
        const attempt = reconnectCountRef.current;

        setState((prev) => {
          if (prev.phase === "done" || prev.phase === "error") return prev;

          if (attempt < MAX_RECONNECT_ATTEMPTS) {
            // Reconnect regardless of whether the token event was received.
            // The server ignores the token anyway (no KV store) — every
            // reconnect restarts generation cleanly. Without this, any drop
            // before the very first SSE frame arrives kills all retries.
            return {
              ...prev,
              error: `Connection interrupted — reconnecting (${attempt + 1}/${MAX_RECONNECT_ATTEMPTS})…`,
            };
          }

          return {
            ...prev,
            phase: "error",
            error: `Generation interrupted after ${attempt} retries. Your files so far are preserved — you can retry.`,
          };
        });

        // Schedule reconnect outside setState to avoid double-fire in StrictMode
        if (attempt < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY_MS[attempt] ?? 8000;
          reconnectCountRef.current += 1;
          reconnectTimerRef.current = setTimeout(() => {
            if (isStoppedRef.current) return;
            setState((p) => ({ ...p, error: null, reconnectCount: reconnectCountRef.current }));
            connect(true);
          }, delay);
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prompt, siteName, apiUrl, onComplete]
  );

  // ── Start ────────────────────────────────────────────────────────────────
  function start() {
    isStoppedRef.current = false;
    reconnectCountRef.current = 0;
    tokenRef.current = null;
    connect(false);
  }

  // ── Stop/cancel ──────────────────────────────────────────────────────────
  function stop() {
    isStoppedRef.current = true;
    clearTimeout(reconnectTimerRef.current!);
    clearInterval(elapsedTimerRef.current!);
    esRef.current?.close();
    setState((prev) => ({ ...prev, phase: "idle" }));
  }

  // ── Retry (full restart) ─────────────────────────────────────────────────
  function retry() {
    stop();
    setState({
      phase: "idle",
      plan: null,
      currentStepId: null,
      completedSteps: new Set(),
      files: {},
      qualityScore: null,
      error: null,
      token: null,
      reconnectCount: 0,
      elapsedMs: 0,
    });
    setTimeout(() => start(), 100);
  }

  useEffect(() => {
    return () => {
      isStoppedRef.current = true;
      clearTimeout(reconnectTimerRef.current!);
      clearInterval(elapsedTimerRef.current!);
      esRef.current?.close();
    };
  }, []);

  return { state, start, stop, retry };
}
