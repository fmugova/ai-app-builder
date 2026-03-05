"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

// Key used to avoid infinite reload loops if the new build also fails
const CHUNK_RELOAD_KEY = "chunkErrorReloadedAt";

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /loading chunk/i.test(error.message) ||
    /failed to load chunk/i.test(error.message) ||
    /loading css chunk/i.test(error.message)
  );
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      // ChunkLoadError: old build's JS chunks no longer exist after a new deployment.
      // Auto-reload once to pick up the new build. Guard against reload loops by
      // only reloading if we haven't already done so in the last 30 seconds.
      const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
      const now = Date.now();
      if (now - lastReload > 30_000) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
        window.location.reload();
        return;
      }
    }
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
