import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import portfolioMarkup from "../portfolio/markup.html?raw";

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
  const portfolio = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const images = portfolio.current?.querySelectorAll(".visual-frame > img");
    images?.forEach((image) => {
      if (image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0) {
        image.parentElement?.classList.add("has-image");
      }
    });
  }, []);
  return (
    <div ref={portfolio} dangerouslySetInnerHTML={{ __html: portfolioMarkup }} />
  );
}
