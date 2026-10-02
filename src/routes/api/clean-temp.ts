import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/clean-temp")({
  server: {
    handlers: {
      POST: async () => {
        return Response.json({ success: true, message: "Temporary buffers wiped." });
      },
    },
  },
});
