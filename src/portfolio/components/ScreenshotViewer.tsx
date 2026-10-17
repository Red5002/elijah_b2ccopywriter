import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

const ViewerContext = createContext<{
  openImage: (src: string, alt: string, trigger: HTMLElement) => void;
}>({ openImage: () => {} });

export const useScreenshotViewer = () => useContext(ViewerContext);

export function ScreenshotViewer({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!image || !dialog.current) return;
    dialog.current.showModal();
    document.body.classList.add("viewer-open");
    return () => {
      document.body.classList.remove("viewer-open");
    };
  }, [image]);

  const toggleZoom = () => {
    setZoomed((value) => !value);
    stage.current?.scrollTo({ top: 0, left: 0 });
  };
  const onClose = () => {
    setImage(null);
    setZoomed(false);
    trigger.current?.focus({ preventScroll: true });
  };

  return (
    <ViewerContext.Provider
      value={{
        openImage: (src, alt, element) => {
          trigger.current = element;
          setZoomed(false);
          setImage({ src, alt });
        },
      }}
    >
      {children}
      <dialog
        ref={dialog}
        className="image-viewer"
        aria-labelledby="viewer-title"
        onClose={onClose}
      >
        <div className="viewer-toolbar">
          <p className="viewer-title" id="viewer-title">
            {image?.alt}
          </p>
          <div className="viewer-controls">
            <Button
              variant="portfolio"
              className="btn icon-button"
              onClick={toggleZoom}
              aria-label={zoomed ? "Zoom out" : "Zoom in"}
              title={zoomed ? "Zoom out" : "Zoom in"}
              aria-pressed={zoomed}
            >
              {zoomed ? "−" : "+"}
            </Button>
            <Button
              variant="portfolio"
              className="btn icon-button"
              onClick={() => dialog.current?.close()}
              aria-label="Close image"
              title="Close image"
            >
              ×
            </Button>
          </div>
        </div>
        <div
          ref={stage}
          className={`viewer-stage${zoomed ? " zoomed" : ""}`}
          tabIndex={0}
          aria-label="Enlarged screenshot"
        >
          {image && <img src={image.src} alt={image.alt} onClick={toggleZoom} />}
        </div>
      </dialog>
    </ViewerContext.Provider>
  );
}
