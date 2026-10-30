import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const BigstaApp = lazy(() => import("@/bigsta/App"));

export const Route = createFileRoute("/$")({
  component: Splat,
});

function Splat() {
  return (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <BigstaApp />
      </Suspense>
    </ClientOnly>
  );
}
