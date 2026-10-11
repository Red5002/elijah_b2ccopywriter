import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import portfolioMarkup from "../portfolio/markup.html?raw";
import { initializePortfolio } from "../portfolio/interactions.js";

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
    const root = portfolio.current;
    if (!root) return;
    const images = root.querySelectorAll(".screenshot-link img");
    const markLoaded = (event: Event) => {
      const image = event.target;
      if (image instanceof HTMLImageElement && image.naturalWidth > 0) {
        image.closest(".visual-frame")?.classList.add("has-image");
      }
    };
    root.addEventListener("load", markLoaded, true);
    images?.forEach((image) => {
      if (image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0) {
        image.closest(".visual-frame")?.classList.add("has-image");
      }
    });
    const cleanup = initializePortfolio(root);
    return () => {
      root.removeEventListener("load", markLoaded, true);
      cleanup();
    };
  }, []);
  return (
    <div ref={portfolio} dangerouslySetInnerHTML={{ __html: portfolioMarkup }} />
  );
}
