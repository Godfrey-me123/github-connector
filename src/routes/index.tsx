import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const BigstaApp = lazy(async () => {
  try {
    return await import("@/bigsta/App");
  } catch (err) {
    console.warn("Retrying BigstaApp import...", err);
    await new Promise((r) => setTimeout(r, 400));
    return await import("@/bigsta/App");
  }
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BIGsta - ID Card Template Designer & Renderer" },
      {
        name: "description",
        content:
          "BIGsta: design and render ID cards (NIDA, NHIF, driving licence) with precise templates, variables and multi-format export.",
      },
      { property: "og:title", content: "BIGsta - ID Card Template Designer & Renderer" },
      {
        property: "og:description",
        content:
          "Design and render ID cards with precise templates, variables and multi-format export.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
  errorComponent: () => (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground p-4">
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <span className="text-base font-bold">Workspace Updating</span>
        <p className="text-xs text-muted-foreground">The application workspace is reconnecting. Please reload to continue.</p>
        <button
          onClick={() => {
            window.location.reload();
          }}
          className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer shadow-sm hover:opacity-90"
        >
          Reload Workspace
        </button>
      </div>
    </main>
  ),
});

function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground" aria-busy="true">
      <div className="flex flex-col items-center gap-3" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <span className="text-sm">Opening BIGsta…</span>
      </div>
    </main>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <BigstaApp />
      </Suspense>
    </ClientOnly>
  );
}
