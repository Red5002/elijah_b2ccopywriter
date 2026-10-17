import { createFileRoute } from "@tanstack/react-router";
import { Portfolio } from "../portfolio/Portfolio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Elijah | B2C SaaS Copywriter (Ex Full-Stack Dev)" },
      { name: "description", content: "I write copy that makes users click, not just read. Elijah — full-stack dev turned B2C SaaS copywriter. React / Django / Supabase." },
      { property: "og:title", content: "Elijah | B2C SaaS Copywriter" },
      { property: "og:description", content: "Full-stack dev turned B2C copywriter. Copy that makes users click, not just read." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Portfolio />;
}
