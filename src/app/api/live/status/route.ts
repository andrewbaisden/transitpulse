import IORedis from "ioredis";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

const STATUS_UPDATES_CHANNEL = "service-status-updates";

/**
 * Server-Sent Events, not WebSockets: this is strictly server→client (the
 * worker publishes real status changes, the client never sends anything
 * back), and SSE works as a plain streamed Route Handler response — no
 * custom server needed. See DECISIONS.md ADR-021.
 *
 * Pub/sub requires a dedicated Redis connection (can't share one also
 * used for other commands), so this opens its own per-request subscriber
 * and disconnects it when the client goes away.
 */
export async function GET(request: NextRequest) {
  const subscriber = new IORedis(env.REDIS_URL);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      subscriber.subscribe(STATUS_UPDATES_CHANNEL).catch((error: unknown) => {
        console.error("Failed to subscribe to status updates:", error);
      });
      subscriber.on("message", (_channel, message) => {
        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      });
    },
    cancel() {
      subscriber.disconnect();
    },
  });

  request.signal.addEventListener("abort", () => {
    subscriber.disconnect();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
