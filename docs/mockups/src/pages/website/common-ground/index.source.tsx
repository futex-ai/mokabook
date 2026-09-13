import {
  ArrowLink,
  docsUrl,
  Footer,
  Navigation,
} from "../../../components/chrome.js";
import { ReviewDemo } from "../../../components/demos.js";
import { Icon } from "../../../components/icons.js";

export function CommonGroundScreen() {
  return (
    <div className="website common-ground" id="top">
      <Navigation section="How it comes together" action="Explore Mokly" />
      <main>
        <section className="common-hero wrap">
          <span className="common-eyebrow">
            <span className="status-dot" /> A shared picture for product teams
          </span>
          <h1>
            Great products start
            <br />
            on{" "}
            <span>
              common ground
              <svg
                viewBox="0 0 640 24"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M4 14Q300-8 634 12M92 21Q360 5 603 20" />
              </svg>
            </span>
            .
          </h1>
          <p>
            Bring the idea, the details, and the conversation together.
            <br className="desktop-break" /> Give everyone a clear view of what
            you’re building next.
          </p>
          <div className="hero-actions">
            <ArrowLink href="#review">Take a closer look</ArrowLink>
            <ArrowLink href={docsUrl} secondary>
              Explore the open-source tool
            </ArrowLink>
          </div>
          <div className="common-hero-note">
            <span className="avatar-stack">
              <span className="tiny-avatar amber">JD</span>
              <span className="tiny-avatar blue">AL</span>
              <span className="tiny-avatar green">SK</span>
            </span>
            <span>For the people shaping the product. Together.</span>
          </div>
        </section>
        <section
          className="common-product wrap"
          id="review"
          aria-label="Interactive illustration of shared design review"
        >
          <div className="common-product-label">
            <span>
              <span className="status-dot" /> The next version, in view
            </span>
            <span>ONE SCREEN. A SHARED CONVERSATION.</span>
          </div>
          <ReviewDemo />
          <div className="common-product-caption">
            <span>
              <Icon name="grid" /> The design
            </span>
            <span className="caption-line" />
            <span>
              <Icon name="comment" /> The conversation
            </span>
            <span className="caption-line" />
            <span>
              <Icon name="branch" /> The next step
            </span>
          </div>
        </section>
        <section className="common-workflow wrap section-space" id="workflow">
          <div className="section-heading">
            <span className="eyebrow">From “I think” to “I see”</span>
            <h2>
              A little less explaining.
              <br />A lot more understanding.
            </h2>
            <p>
              When everyone can see the same thing, the next conversation starts
              one step ahead.
            </p>
          </div>
          <div className="common-bento">
            <article className="bento-context">
              <div className="bento-visual">
                <div className="context-page">
                  <span>Website launch</span>
                  <i />
                  <i />
                  <b>＋ New task</b>
                  <span className="context-pin">1</span>
                </div>
                <div className="context-comment">
                  <span className="tiny-avatar blue">AL</span>
                  <span>
                    That’s exactly what I meant.
                    <Icon name="check" />
                  </span>
                </div>
              </div>
              <span className="eyebrow">The conversation, in context</span>
              <h3>
                Point to the detail.
                <br />
                Get to the decision.
              </h3>
              <p>
                A shared screen gives feedback a place to land. Keep the
                discussion close to the thing you’re deciding.
              </p>
            </article>
            <article className="bento-whole">
              <div className="bento-visual">
                <div className="journey-step">
                  <span>01</span>
                  <strong>A warm welcome</strong>
                  <Icon name="check" />
                </div>
                <span className="journey-connector" />
                <div className="journey-step">
                  <span>02</span>
                  <strong>A clear next step</strong>
                  <Icon name="check" />
                </div>
                <span className="journey-connector" />
                <div className="journey-step">
                  <span>03</span>
                  <strong>A little progress</strong>
                  <Icon name="check" />
                </div>
              </div>
              <span className="eyebrow">The whole journey, in view</span>
              <h3>
                Make the pieces
                <br />
                make sense together.
              </h3>
              <p>
                Move between screens and follow the flow. See how a good detail
                adds up to a better experience.
              </p>
            </article>
          </div>
        </section>
        <section className="common-foundation wrap" id="foundation">
          <div className="foundation-symbol">
            <Icon name="code" />
          </div>
          <div>
            <span className="eyebrow">
              Shared understanding. Open foundations.
            </span>
            <h2>
              Made with your components.
              <br />
              At home with your code.
            </h2>
            <p>
              Keep Storybook for your component library. Use Mokly to bring
              those components together into a picture of the whole product.
            </p>
          </div>
          <a className="text-link" href={docsUrl}>
            Meet the open-source tool <Icon name="arrow" />
          </a>
        </section>
        <section className="common-closing wrap section-space">
          <span className="eyebrow">
            Your next idea deserves a clear picture
          </span>
          <h2>
            Make something
            <br />
            <em>you can all see.</em>
          </h2>
          <ArrowLink href={docsUrl}>Start with your first screen</ArrowLink>
          <p>Open source. Your components. Your repository.</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
