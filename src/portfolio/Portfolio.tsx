import { useRef, useState } from "react";
import { Navigation } from "./components/Navigation";
import { Hero } from "./components/Hero";
import { Services } from "./components/Services";
import { SelectedWork } from "./components/SelectedWork";
import { About } from "./components/About";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { ScreenshotViewer } from "./components/ScreenshotViewer";
import { OrderModal } from "./components/order-modal/OrderModal";
import type { OrderOfferId } from "@/lib/orders";

export function Portfolio() {
  const [selectedOffer, setSelectedOffer] = useState<OrderOfferId | null>(null);
  const orderTrigger = useRef<HTMLElement | null>(null);

  return (
    <ScreenshotViewer>
      <Navigation />
      <main id="top">
        <Hero />
        <Services
          onSelectOffer={(offerId, trigger) => {
            orderTrigger.current = trigger;
            setSelectedOffer(offerId);
          }}
        />
        <SelectedWork />
        <About />
        <Contact />
      </main>
      <Footer />
      <OrderModal
        offerId={selectedOffer}
        onClose={() => setSelectedOffer(null)}
        triggerRef={orderTrigger}
      />
    </ScreenshotViewer>
  );
}
