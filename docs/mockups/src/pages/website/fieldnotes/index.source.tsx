import {
  ArrowLink,
  docsUrl,
  Footer,
  InstallCommand,
  Navigation,
} from "../../../components/chrome.js";
import { CatalogueDemo } from "../../../components/demos.js";
import { Icon } from "../../../components/icons.js";

export function FieldnotesScreen() {
  return (
    <div className="website fieldnotes" id="top">
      <Navigation />
      <main>
        <section className="field-hero wrap">
          <div className="field-hero-copy">
            <span className="eyebrow">
              <span className="status-dot" /> A little clarity goes a long way
            </span>
            <h1>
              Get on the
              <br />
              same page.
              <br />
              <em>Before you build.</em>
            </h1>
            <p>
              Give your next product idea a place to take shape. Real screens,
              your own components, and a shared picture of what comes next.
            </p>
            <div className="hero-actions">
              <ArrowLink href="#catalogue">See the bigger picture</ArrowLink>
              <a className="text-link" href={docsUrl}>
                Start building <span aria-hidden="true">↗</span>
              </a>
            </div>
            <span className="hero-understatement">
              Your designs. In your repo. Always yours.
            </span>
          </div>
          <CatalogueDemo />
        </section>
        <section
          className="field-principles wrap"
          aria-label="Product principles"
        >
          <span>
            A familiar home
            <br />
            for your next idea.
          </span>
          <strong>
            <Icon name="code" /> Your components
          </strong>
          <strong>
            <Icon name="branch" /> Your repository
          </strong>
          <strong>
            <Icon name="grid" /> The whole product
          </strong>
        </section>
        <section className="field-catalogue wrap section-space" id="catalogue">
          <div className="section-heading">
            <span className="eyebrow">
              From a good idea to a shared picture
            </span>
            <h2>
              The details matter.
              <br />
              <em>So does the whole.</em>
            </h2>
            <p>
              Go beyond an isolated button. Explore the screens, states, and
              journeys that make your product feel like your product.
            </p>
          </div>
          <div className="field-features">
            <article>
              <div className="feature-art art-screens">
                <span className="mini-window">
                  <i />
                  <i />
                  <i />
                  <b />
                </span>
                <span className="mini-phone">
                  <i />
                  <i />
                </span>
                <span className="art-caption">
                  One idea. Every screen size.
                </span>
              </div>
              <span className="feature-number">01 / SCREENS</span>
              <h3>Make the idea tangible.</h3>
              <p>
                Put mobile and desktop in the same conversation, built from the
                components you already use.
              </p>
            </article>
            <article>
              <div className="feature-art art-flows">
                <span>Welcome</span>
                <Icon name="arrow" />
                <span>Your workspace</span>
                <Icon name="arrow" />
                <span>You’re in.</span>
              </div>
              <span className="feature-number">02 / FLOWS</span>
              <h3>Connect the moments.</h3>
              <p>
                Walk through the journey. See where a screen takes someone, and
                what they need along the way.
              </p>
            </article>
            <article>
              <div className="feature-art art-changes">
                <div>
                  <span>Before</span>
                  <i />
                </div>
                <Icon name="arrow" />
                <div>
                  <span>After</span>
                  <i />
                  <b>
                    <Icon name="check" />
                  </b>
                </div>
              </div>
              <span className="feature-number">03 / CHANGES</span>
              <h3>See what’s different.</h3>
              <p>
                Compare the design with its earlier version. Keep the discussion
                grounded in the actual change.
              </p>
            </article>
          </div>
        </section>
        <section className="field-workflow section-space" id="workflow">
          <div className="wrap">
            <div>
              <span className="eyebrow">A natural part of the work</span>
              <h2>
                Ideas move forward.
                <br />
                <em>Context comes along.</em>
              </h2>
            </div>
            <ol className="field-steps">
              <li>
                <span>01</span>
                <div>
                  <h3>Shape it.</h3>
                  <p>Compose the next screen with your own building blocks.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>Talk it through.</h3>
                  <p>Share the catalogue and compare the changes together.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Build with a clear picture.</h3>
                  <p>
                    Keep the design beside the implementation in the same
                    repository.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>
        <section
          className="field-foundation wrap section-space"
          id="foundation"
        >
          <div className="foundation-stamp">
            <Icon name="code" />
            <span>
              OPEN
              <br />
              BY DESIGN
            </span>
          </div>
          <div>
            <span className="eyebrow">A foundation you own</span>
            <h2>
              Your work belongs
              <br />
              <em>with your work.</em>
            </h2>
            <p>
              Mokabook is open source. Render your screens locally, commit them
              with your code, and share a catalogue on your own terms.
            </p>
            <ArrowLink href={docsUrl}>Make your first catalogue</ArrowLink>
          </div>
          <InstallCommand />
        </section>
      </main>
      <Footer />
    </div>
  );
}
