import { Button } from "@/components/ui/button";
import { assets } from "../assets";
import { useScreenshotViewer } from "./ScreenshotViewer";

export function SelectedWork() {
  const { openImage } = useScreenshotViewer();
  return (
    <>
      {" "}
      <section id="work" className="section band">
        <div className="container">
          <div className="work-heading">
            <div>
              <div className="eyebrow">{"Selected work / 01—02"}</div>
              <h2>{"Less friction. More action."}</h2>
            </div>
            <p>{"Two spec projects."}</p>
          </div>
          <div className="project-index">
            <a className="project-link" href="#subzero">
              <span className="number">{"01 / B2C FINTECH SAAS"}</span>
              <h3>
                {"SubZero "}
                <span className="dim">{"— Subscription Killer"}</span>
              </h3>
              <p>{"Stop paying for apps you forgot about"}</p>
              <div className="link-footer">
                {"Email · Cancellation flow · Success state "}
                <span aria-hidden="true">{"↗"}</span>
              </div>
            </a>
            <a className="project-link" href="#clipforge">
              <span className="number">{"02 / B2C CREATOR TOOL"}</span>
              <h3>
                {"ClipForge "}
                <span className="dim">{"— AI Clip Generator"}</span>
              </h3>
              <p>{"Your YouTube video is 10 TikToks you haven't posted yet"}</p>
              <div className="link-footer">
                {"Positioning · Activation copy "}
                <span aria-hidden="true">{"↗"}</span>
              </div>
            </a>
          </div>
        </div>
      </section>
      <section id="subzero" className="section">
        <div className="container">
          <div className="project-header">
            <div>
              <div className="eyebrow">{"01 / B2C Fintech SaaS · Spec project"}</div>
              <h2>
                {"SubZero "}
                <span className="dim">{"— Subscription Killer"}</span>
              </h2>
              <p className="tagline">{"Stop paying for apps you forgot about"}</p>
            </div>
            <a
              className="demo-link"
              href="https://subzero-jts5.onrender.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {"Open full demo ↗"}
            </a>
          </div>
          <div className="problem-row">
            <span className="label">{"The problem"}</span>
            <p>
              {"Users lose "}
              <strong className="accent">{"$348/year"}</strong>
              {" on forgotten subs."}
            </p>
          </div>
          <div className="rewrite-label label">
            {"My rewrite / From forgotten charges to money back"}
          </div>
          <div className="image-grid">
            <figure className="visual">
              <div className="visual-frame">
                <a
                  className="screenshot-link"
                  aria-haspopup="dialog"
                  aria-label="Enlarge 01 / Re-engagement email"
                  href={assets.subzero_email}
                  onClick={(event) => {
                    event.preventDefault();
                    openImage(
                      assets.subzero_email,
                      "01 / Re-engagement email",
                      event.currentTarget,
                    );
                  }}
                >
                  <img alt="01 / Re-engagement email" loading="eager" src={assets.subzero_email} />
                  <span className="image-expand" aria-hidden="true">
                    {"↗"}
                  </span>
                </a>
                <div className="mockup">
                  <div className="mail-chrome">
                    <span className="mail-mark">{"M"}</span>
                    {" Inbox "}
                    <span className="tiny">{"/ SubZero"}</span>
                  </div>
                  <div className="tiny">{"SubZero · to Alex"}</div>
                  <h4>{"Your forgotten apps are still charging."}</h4>
                  <p>
                    {
                      "Alex, you're paying for 3 apps you don't use — $564/year. DesignApp Pro hasn't been opened in 64 days. Still charging $29/mo. Want me to kill them for you?"
                    }
                  </p>
                  <div className="mock-button">{"Yes, cancel my zombie subs"}</div>
                </div>
              </div>
              <figcaption>
                {"01 / Re-engagement email"}
                <span>{"SPEC COPY"}</span>
              </figcaption>
            </figure>
            <figure className="visual">
              <div className="visual-frame">
                <a
                  className="screenshot-link"
                  aria-haspopup="dialog"
                  aria-label="Enlarge 02 / Cancellation modal"
                  href={assets.subzero_modal}
                  onClick={(event) => {
                    event.preventDefault();
                    openImage(assets.subzero_modal, "02 / Cancellation modal", event.currentTarget);
                  }}
                >
                  <img alt="02 / Cancellation modal" loading="eager" src={assets.subzero_modal} />
                  <span className="image-expand" aria-hidden="true">
                    {"↗"}
                  </span>
                </a>
                <div className="mockup">
                  <div className="modal-logo">{"↗"}</div>
                  <h4>{"Cancel DesignApp Pro and save $29/mo?"}</h4>
                  <p>
                    {
                      "We'll handle the annoying email + cancellation flow. You keep access until Oct 14th, but won't be billed again."
                    }
                  </p>
                  <div className="mock-button">{"Yes, save me $29/mo"}</div>
                  <div className="mock-button mock-secondary">{"No, keep charging me"}</div>
                </div>
              </div>
              <figcaption>
                {"02 / Cancellation modal"}
                <span>{"SPEC COPY"}</span>
              </figcaption>
            </figure>
            <figure className="visual">
              <div className="visual-frame">
                <a
                  className="screenshot-link"
                  aria-haspopup="dialog"
                  aria-label="Enlarge 03 / Savings card"
                  href={assets.subzero_success}
                  onClick={(event) => {
                    event.preventDefault();
                    openImage(assets.subzero_success, "03 / Savings card", event.currentTarget);
                  }}
                >
                  <img alt="03 / Savings card" loading="eager" src={assets.subzero_success} />
                  <span className="image-expand" aria-hidden="true">
                    {"↗"}
                  </span>
                </a>
                <div className="mockup success-mock">
                  <div className="success-check">{"✓"}</div>
                  <h4>{"You just saved $348 this year 🎉"}</h4>
                  <div className="savings">{"$348"}</div>
                  <p>{"Back in your pocket. Not another subscription."}</p>
                  <div className="success-total">
                    <p>
                      {"Total saved with SubZero so far: "}
                      <strong className="accent">{"$348.00"}</strong>
                    </p>
                  </div>
                </div>
              </div>
              <figcaption>
                {"03 / Savings card"}
                <span>{"SPEC COPY"}</span>
              </figcaption>
            </figure>
          </div>
          <div className="result">
            <span className="label">{"Result"}</span>
            <p>{"Made cancellation feel like winning, not losing."}</p>
          </div>
        </div>
      </section>
      <section id="clipforge" className="section band">
        <div className="container">
          <div className="project-header">
            <div>
              <div className="eyebrow">{"02 / B2C Creator Tool · Spec project"}</div>
              <h2>
                {"ClipForge "}
                <span className="dim">{"— AI Clip Generator"}</span>
              </h2>
              <p className="tagline">{"Your YouTube video is 10 TikToks you haven't posted yet"}</p>
            </div>
            <a
              className="demo-link"
              href="https://clipforge-spec-project.onrender.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {"Open full demo ↗"}
            </a>
          </div>
          <div className="problem-row">
            <span className="label">{"The problem"}</span>
            <p>
              {"Creators spend "}
              <strong className="accent">{"3 hours"}</strong>
              {" editing 1 video into clips."}
            </p>
          </div>
          <div className="label">{"My rewrite"}</div>
          <div className="comparison">
            <div className="before">
              <div className="compare-copy">
                <span className="label">{"Before"}</span>
                <p className="dim">{"“AI-powered clips in 10 seconds”"}</p>
              </div>
              <figure className="visual">
                <div className="visual-frame">
                  <div className="mockup timeline">
                    <div className="timeline-toolbar">
                      <span>{"Premiere Pro / Sequence 01"}</span>
                      <span>{"00:03:12:08"}</span>
                    </div>
                    <div className="preview-monitor">{"▶   One video. Hours of edits."}</div>
                    <div className="tracks">
                      <div className="track">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <div className="track">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <div className="track">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <div className="track">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
                <figcaption>
                  {"Manual editing / Premiere timeline"}
                  <span>{"ILLUSTRATION"}</span>
                </figcaption>
              </figure>
            </div>
            <div className="after">
              <div className="compare-copy">
                <span className="label">{"After"}</span>
                <p>
                  {
                    "“Turn 1 long video into 10 viral-ready clips. Auto-captions, hooks, and cuts — done.”"
                  }
                </p>
              </div>
              <figure className="visual">
                <div className="visual-frame">
                  <a
                    className="screenshot-link"
                    aria-haspopup="dialog"
                    aria-label="Enlarge ClipForge / Ready-to-post clips"
                    href={assets.clipforge_grid}
                    onClick={(event) => {
                      event.preventDefault();
                      openImage(
                        assets.clipforge_grid,
                        "ClipForge / Ready-to-post clips",
                        event.currentTarget,
                      );
                    }}
                  >
                    <img
                      alt="ClipForge / Ready-to-post clips"
                      loading="eager"
                      src={assets.clipforge_grid}
                    />
                    <span className="image-expand" aria-hidden="true">
                      {"↗"}
                    </span>
                  </a>
                  <div className="mockup clips">
                    <div className="clip">
                      <span className="clip-count">{"CLIP 01 / 00:32"}</span>
                      <div className="clip-scene">{"▶"}</div>
                      <div className="clip-caption">
                        {"THE MISTAKE THAT COST ME "}
                        <em>{"$10K"}</em>
                      </div>
                    </div>
                    <div className="clip">
                      <span className="clip-count">{"CLIP 02 / 00:24"}</span>
                      <div className="clip-scene">{"▶"}</div>
                      <div className="clip-caption">
                        {"STOP DOING "}
                        <em>{"THIS"}</em>
                      </div>
                    </div>
                    <div className="clip">
                      <span className="clip-count">{"CLIP 03 / 00:41"}</span>
                      <div className="clip-scene">{"▶"}</div>
                      <div className="clip-caption">
                        {"I WISH I KNEW THIS "}
                        <em>{"SOONER"}</em>
                      </div>
                    </div>
                  </div>
                </div>
                <figcaption>
                  {"ClipForge / Ready-to-post clips"}
                  <span>{"SPEC COPY"}</span>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>{" "}
    </>
  );
}
