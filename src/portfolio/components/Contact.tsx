import { Button } from "@/components/ui/button";

export function Contact() {
  return (
    <>
      {" "}
      <section id="contact" className="contact band">
        <div className="container">
          <div className="eyebrow accent">{"Let's find the friction"}</div>
          <h2>{"Got a B2C product that feels like a feature factory?"}</h2>
          <p className="sub">{"I'll do a free 15-min teardown loom of your onboarding."}</p>
          <Button asChild variant="portfolio" className="btn btn-primary portfolio-button">
            <a href="mailto:amujoelijah3@gmail.com?subject=Free%2015-min%20Onboarding%20Teardown&body=Hi%20Elijah%2C%0A%0AHere%27s%20my%20product%20and%20onboarding%20link%3A%20%0A%0A">
              {"Get My Free Teardown "}
              <span aria-hidden="true">{"↗"}</span>
            </a>
          </Button>
          <p className="email">{"amujoelijah3@gmail.com"}</p>
          <div className="socials">
            <a href="https://github.com/Red5002" target="_blank" rel="noopener noreferrer">
              {"GitHub ↗"}
            </a>
            <a href="mailto:amujoelijah3@gmail.com">{"Email ↗"}</a>
          </div>
        </div>
      </section>{" "}
    </>
  );
}
