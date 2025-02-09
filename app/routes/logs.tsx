import { eventStream } from "remix-utils/sse/server";
import { emitter } from "~/service/emitter.server";
import type { Route } from "./+types/logs";

export async function loader({ request }: Route.LoaderArgs) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("SSE logging is only for development");
  }
  const event = "log";

  return eventStream(
    request.signal,
    (send) => {
      const handle = (data: string) => {
        send({ event, data });
      };

      emitter.on(event, handle);

      return () => {
        emitter.off(event, handle);
      };
    },
    {
      // Tip: You need this if using Nginx as a reverse proxy
      headers: { "X-Accel-Buffering": "no" },
    },
  );
}
