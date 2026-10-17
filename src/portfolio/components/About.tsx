export function About() {
  return (
    <>
      {" "}
      <section className="section">
        <div className="container">
          <div className="process-head">
            <h2>{"How I think."}</h2>
            <p>{"I analyze hooks, anticipate objections, and clear the path to the buy button."}</p>
          </div>
          <div className="process-grid">
            <div className="process-item">
              <h4>{"Clarity over Cleverness"}</h4>
              <p>
                {
                  "If the customer has to think twice about what you sell, you've already lost the sale."
                }
              </p>
            </div>
            <div className="process-item">
              <h4>{"Customer Psychology"}</h4>
              <p>
                {
                  "I write for the person behind the screen — their fears, goals, and specific pain points."
                }
              </p>
            </div>
            <div className="process-item">
              <h4>{"Benefit-Driven"}</h4>
              <p>
                {
                  "I bridge the gap between what your code does and why your customer actually cares."
                }
              </p>
            </div>
          </div>
        </div>
      </section>
      <section id="about" className="section band">
        <div className="container about-layout">
          <div className="identity">
            <img
              alt="Elijah"
              className="portrait"
              src="/elijah.jpeg"
              hidden
              onLoad={(event) => {
                event.currentTarget.hidden = false;
              }}
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
            <div className="eyebrow">{"Code • Copy • Clicks"}</div>
            <h3>{"Elijah"}</h3>
            <p>
              {"B2C SaaS Copywriter"}
              <br />
              {"(Ex Full-Stack Dev)"}
            </p>
            <div className="tech-stack">
              <span>{"React"}</span>
              <span>{"Django"}</span>
              <span>{"Supabase"}</span>
            </div>
          </div>
          <div className="about-copy">
            <div className="eyebrow">{"The person behind the words"}</div>
            <h2>{"A builder who writes."}</h2>
            <p>
              {
                "I used to ship features nobody used. Now I write the words that make them use it. As an ex full-stack dev, I don't just write copy — I think in flows, states, and edge cases. Empty state, error state, success state = all copy opportunities."
              }
            </p>
            <ul className="about-list">
              <li>{"I code what I write"}</li>
              <li>{"I write for activation, not just acquisition"}</li>
              <li>{"I A/B test words like features"}</li>
            </ul>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container edge-layout">
          <div>
            <div className="eyebrow">{"My edge"}</div>
            <h3>{"Technical Fluency"}</h3>
            <p>
              {
                "I speak “Engineer” and “Customer” fluently. I look beyond surface-level features to find the reason someone should care."
              }
            </p>
          </div>
          <div className="edge-quote">
            {"“I don't just write copy — I think in flows, states, and edge cases.”"}
          </div>
        </div>
      </section>{" "}
    </>
  );
}
