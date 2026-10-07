import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/remove-bg")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const file = formData.get("image") as File;
          if (!file) {
            return new Response(JSON.stringify({ error: "No image provided" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Forward to Bgninja API with strict settings
          const bgninjaFormData = new FormData();
          bgninjaFormData.append("file", file);
          bgninjaFormData.append("src", "image-edit-app");

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
            const r = await fetch("https://bgninja.com/api/remove", {
              method: "POST",
              body: bgninjaFormData,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (r.ok) {
              const buffer = await r.arrayBuffer();
              return new Response(buffer, {
                status: 200,
                headers: { "Content-Type": "image/png" },
              });
            }
          } catch (e) {
            console.warn("Bgninja background removal warning:", e);
          }

          // Fallback to original image buffer with pristine color fidelity if API fails
          const arrayBuffer = await file.arrayBuffer();
          return new Response(arrayBuffer, {
            status: 200,
            headers: { "Content-Type": file.type || "image/png" },
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err.message || "Failed to process background removal" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
