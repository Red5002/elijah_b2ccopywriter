import { Navigation } from "./components/Navigation";
import { Hero } from "./components/Hero";
import { Services } from "./components/Services";
import { SelectedWork } from "./components/SelectedWork";
import { About } from "./components/About";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { ScreenshotViewer } from "./components/ScreenshotViewer";

export function Portfolio() {
  return (
    <ScreenshotViewer>
      <Navigation />
      <main id="top">
        <Hero />
        <Services />
        <SelectedWork />
        <About />
        <Contact />
      </main>
      <Footer />
    </ScreenshotViewer>
  );
}