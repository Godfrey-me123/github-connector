import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import BigstaApp from "@/bigsta/App";

export const Route = createFileRoute("/$")({
  component: Splat,
});

function Splat() {
  return (
    <ClientOnly fallback={null}>
      <BigstaApp />
    </ClientOnly>
  );
}
