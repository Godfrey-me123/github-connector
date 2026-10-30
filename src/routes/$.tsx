import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const BigstaApp = lazy(() => import("@/bigsta/App"));

export const Route = createFileRoute("/$")({
  component: Splat,
});

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Loading BIGsta…
    </div>
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
