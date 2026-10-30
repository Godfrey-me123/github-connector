import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import BigstaApp from "@/bigsta/App";

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
});

function Index() {
  return (
    <ClientOnly fallback={null}>
      <BigstaApp />
    </ClientOnly>
  );
}
