import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const BigstaApp = lazy(() => import("@/bigsta/App"));

export const Route = createFileRoute("/$")({
  component: Splat,
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

function Splat() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <BigstaApp />
      </Suspense>
    </ClientOnly>
  );
}
