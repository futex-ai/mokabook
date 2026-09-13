import {
  ArrowLink,
  docsUrl,
  Footer,
  InstallCommand,
  Navigation,
} from "../../../components/chrome.js";
import { AgentDemo } from "../../../components/demos.js";
import { Icon } from "../../../components/icons.js";

export function SignalScreen() {
  return (
    <div className="website signal" id="top">
      <Navigation action="Start with Mokly" />
      <main>
        <section className="signal-hero wrap">
          <div className="signal-overline">
            <span className="eyebrow">
              <span className="signal-pulse" /> Better context. Better products.
            </span>
            <span className="signal-coordinate" aria-hidden="true">
              [ DESIGN → BUILD ]
            </span>
          </div>
          <h1>
            Less guesswork.
            <br />
            <span>More good product.</span>
          </h1>
          <div className="signal-hero-bottom">
            <p>
              Your coding agent can move fast. Give it a clear picture of where
              to go—with real screens, your components, and the context behind
              every change.
            </p>
            <div className="hero-actions">
              <ArrowLink href="#workspace">Explore the idea</ArrowLink>
              <a className="text-link" href={docsUrl}>
                Read the docs ↗
              </a>
            </div>
          </div>
        </section>
        <section
          className="signal-workspace wrap"
          id="workspace"
          aria-label="Interactive illustration of an agent-assisted design workflow"
        >
          <div className="signal-workspace-caption">
            <span>
              <Icon name="spark" /> Intent, made visible.
            </span>
            <span>YOUR IDEA → A CLEARER SCREEN</span>
          </div>
          <AgentDemo />
          <div className="signal-caption">
            <span>Designed with your components.</span>
            <span>Reviewed in context.</span>
            <span>Kept with your code.</span>
          </div>
        </section>
        <section className="signal-workflow wrap section-space" id="workflow">
          <div className="section-heading">
            <span className="eyebrow">Good work starts with good context</span>
            <h2>
              Give the next change
              <br />a better starting point.
            </h2>
          </div>
          <div className="signal-feature-grid">
            <article>
              <span className="signal-feature-icon">
                <Icon name="grid" />
              </span>
              <span className="eyebrow">01 / The picture</span>
              <h3>
                A screen beats
                <br />a long explanation.
              </h3>
              <p>
                Make the layout, states, and small details visible before
                implementation begins.
              </p>
            </article>
            <article>
              <span className="signal-feature-icon">
                <Icon name="code" />
              </span>
              <span className="eyebrow">02 / The building blocks</span>
              <h3>
                Your system.
                <br />
                Already in the design.
              </h3>
              <p>
                Compose screens from your real components, so the design starts
                with the right ingredients.
              </p>
            </article>
            <article>
              <span className="signal-feature-icon">
                <Icon name="branch" />
              </span>
              <span className="eyebrow">03 / The context</span>
              <h3>
                Every change
                <br />
                has a point of reference.
              </h3>
              <p>
                Keep your designs in the repository and compare them as the
                product evolves.
              </p>
            </article>
          </div>
        </section>
        <section className="signal-handoff">
          <div className="wrap">
            <span className="eyebrow">The thread stays intact</span>
            <div className="handoff-sequence">
              <span>Your idea</span>
              <Icon name="arrow" />
              <strong>The shared picture</strong>
              <Icon name="arrow" />
              <span>The next build</span>
            </div>
            <p>Bring the intention along, all the way to implementation.</p>
          </div>
        </section>
        <section
          className="signal-foundation wrap section-space"
          id="foundation"
        >
          <div>
            <span className="eyebrow">Open source at the core</span>
            <h2>
              Own the picture.
              <br />
              <span>Build what’s next.</span>
            </h2>
            <p>
              Start with a local catalogue. Use your React components, review
              changes in Git, and export a site you can host yourself.
            </p>
            <ArrowLink href={docsUrl}>Create your first catalogue</ArrowLink>
          </div>
          <div className="signal-install-card">
            <div className="terminal-title">
              <span className="traffic-lights">
                <i />
                <i />
                <i />
              </span>
              <span>A small first step.</span>
            </div>
            <InstallCommand />
            <div className="terminal-detail">
              <span>
                <Icon name="check" /> MIT licensed
              </span>
              <span>
                <Icon name="check" /> Your repository
              </span>
              <span>
                <Icon name="check" /> Your hosting
              </span>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
