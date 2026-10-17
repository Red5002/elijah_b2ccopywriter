import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <>
      {" "}
      <section className="hero">
        <div className="container">
          <div className="eyebrow">
            <span className="status-dot" aria-hidden="true"></span>
            {" Elijah, B2C SaaS Copywriter (Ex Full-Stack Dev)"}
          </div>
          <h1>
            {"Your users don't need another feature. "}
            <span className="accent">{"They need a reason to click."}</span>
          </h1>
          <p>
            {
              "I'm Elijah — full-stack dev turned B2C copywriter. I turn AI tools and apps into products people actually use and pay for."
            }
          </p>
          <div className="actions">
            <Button asChild variant="portfolio" className="btn btn-primary portfolio-button">
              <a href="#work">
                {"View My Work "}
                <span aria-hidden="true">{"↗"}</span>
              </a>
            </Button>
            <Button asChild variant="portfolio" className="btn portfolio-button">
              <a href="mailto:amujoelijah3@gmail.com?subject=15-min%20Onboarding%20Teardown">
                {"Book a 15-min Teardown "}
                <span aria-hidden="true">{"↗"}</span>
              </a>
            </Button>
          </div>
          <div className="trust">
            {"Built with: "}
            <strong>{"React • Django • Supabase • Copy that converts"}</strong>
          </div>
        </div>
      </section>
      <section className="positioning band">
        <div className="container">
          <p>
            {"I write copy that makes users "}
            <span className="accent">{"click"}</span>
            {", not just read."}
          </p>
          <small>{"Developer brain. Copywriter instincts."}</small>
        </div>
      </section>{" "}
    </>
  );
}
