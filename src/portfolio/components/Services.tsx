import { PaidAudit } from "./services/PaidAudit";
import { FlowFix } from "./services/FlowFix";
import { ActivationRewrite } from "./services/ActivationRewrite";
import type { OrderOfferId } from "@/lib/orders";

type ServicesProps = {
  onSelectOffer: (offerId: OrderOfferId, trigger: HTMLElement) => void;
};

export function Services({ onSelectOffer }: ServicesProps) {
  return (
    <>
      {" "}
      <section id="services" className="section">
        <div className="container services-layout">
          <div>
            <div className="eyebrow">{"Capabilities"}</div>
            <h2>
              {"Conversion-focused"}
              <br />
              {"messaging."}
            </h2>
            <p>
              {
                "Good B2C copy isn't about sounding intelligent. It's about answering: “What's in this for me?”"
              }
            </p>
          </div>
          <div>
            <div className="service-card">
              <h4>{"B2C Landing Pages"}</h4>
              <p>
                {
                  "Clear, benefit-driven copy designed to move visitors toward a single, decisive action."
                }
              </p>
            </div>
            <div className="service-card">
              <h4>{"SaaS & AI Product Copy"}</h4>
              <p>{"Messaging that translates complexity into desire."}</p>
            </div>
            <div className="service-card">
              <h4>{"Email Copy"}</h4>
              <p>
                {"From welcome sequences to re-engagement — short, punchy, and conversion-focused."}
              </p>
            </div>
            <div className="service-card">
              <h4>{"Product Messaging & Marketing Hooks"}</h4>
              <p>{"Turning technical features into customer benefits that stop the scroll."}</p>
            </div>
          </div>
        </div>
      </section>
      <section id="pricing" className="pricing">
        <div className="container">
          <div className="pricing-head">
            <div className="eyebrow">{"Pricing / Micro-offers"}</div>
            <h2>{"Pick a fix. Ship tomorrow."}</h2>
            <p>{"You don't need a full rewrite to see lift. Start with one friction point."}</p>
          </div>
          <div className="pricing-grid">
            <PaidAudit onSelectOffer={(trigger) => onSelectOffer("paid-audit", trigger)} />
            <FlowFix onSelectOffer={(trigger) => onSelectOffer("flow-fix", trigger)} />
            <ActivationRewrite
              onSelectOffer={(trigger) => onSelectOffer("activation-rewrite", trigger)}
            />
          </div>
          <div className="pricing-foot">
            <p className="pricing-note">
              {"2 revisions. Copy that fits your code. Built by a dev, not just a writer."}
            </p>
          </div>
        </div>
      </section>{" "}
    </>
  );
}
