import { BrandMark, Icon } from "./icons.js";
import { PhoneScreen, ProjectScreen } from "./product-screen.js";

export function CatalogueDemo() {
  return (
    <div
      className="catalogue-illustration"
      aria-label="Illustration of desktop and mobile designs in a Mokly catalogue"
    >
      <div className="catalogue-window">
        <div className="window-top">
          <span className="traffic-lights">
            <i />
            <i />
            <i />
          </span>
          <span>
            <BrandMark /> Our product / Website launch
          </span>
          <Icon name="grid" />
        </div>
        <div className="catalogue-canvas">
          <div className="artboard-label">
            <span>DESKTOP</span>
            <span>Our components. Our product.</span>
          </div>
          <ProjectScreen />
        </div>
      </div>
      <div className="floating-note">
        <span className="note-check">
          <Icon name="check" />
        </span>
        <div>
          One shared picture.<small>Every screen, connected.</small>
        </div>
      </div>
      <div className="floating-phone">
        <PhoneScreen />
      </div>
      <span className="handwritten">The whole picture ↗</span>
    </div>
  );
}

export function AgentDemo() {
  return (
    <div className="agent-demo" data-demo="agent">
      <div className="agent-demo-top">
        <div>
          <BrandMark />
          <strong>Website launch</strong>
          <span className="demo-divider">/</span>
          <span>Design workspace</span>
        </div>
        <span className="branch-label">
          <Icon name="branch" /> A better first impression
        </span>
      </div>
      <div className="agent-demo-grid">
        <aside className="agent-outline">
          <span className="eyebrow">The picture</span>
          <div className="outline-selected">
            <Icon name="grid" /> Overview
          </div>
          <div>
            <Icon name="mobile" /> Mobile
          </div>
          <div>
            <Icon name="desktop" /> Desktop
          </div>
          <span className="eyebrow outline-heading">The building blocks</span>
          <span className="component-tag">Button</span>
          <span className="component-tag">Task list</span>
          <span className="component-tag">Project header</span>
          <div className="outline-footer">
            <span className="status-dot" /> Your components
          </div>
        </aside>
        <div className="agent-stage">
          <div className="agent-stage-label">
            <span>Website launch</span>
            <span data-agent-state>Current design</span>
          </div>
          <div data-agent-before>
            <ProjectScreen revised={false} />
          </div>
          <div data-agent-after hidden>
            <ProjectScreen />
          </div>
          <div className="stage-footnote">
            <Icon name="branch" /> A clear starting point for the next change.
          </div>
        </div>
        <aside className="agent-chat">
          <div className="chat-heading">
            <Icon name="spark" />
            <strong>A little more clarity</strong>
          </div>
          <div className="chat-user">
            Make it easier to start a new task. Keep the look and feel we
            already have.
          </div>
          <div className="chat-reply">
            <span className="agent-avatar">
              <BrandMark />
            </span>
            <p>
              Bring “New task” next to the page title, so it’s easy to find as
              soon as you arrive.
            </p>
          </div>
          <div className="agent-checklist">
            <span>
              <Icon name="check" /> Reuse the existing button
            </span>
            <span>
              <Icon name="check" /> Keep mobile in the picture
            </span>
            <span>
              <Icon name="check" /> Review the change together
            </span>
          </div>
          <button
            type="button"
            className="agent-apply"
            data-agent-toggle
            aria-pressed="false"
          >
            Show the update
            <Icon name="arrow" />
          </button>
          <p className="chat-footnote" role="status" data-agent-message>
            Good context makes a better starting point.
          </p>
        </aside>
      </div>
    </div>
  );
}

export function ReviewDemo() {
  return (
    <div className="review-demo" data-demo="review">
      <div className="review-demo-top">
        <span className="review-workspace">
          <BrandMark />
          <strong>Acme’s workspace</strong>
          <span className="demo-divider">/</span>
          <span>Website launch</span>
        </span>
        <span className="review-team">
          <span className="tiny-avatar amber">JD</span>
          <span className="tiny-avatar blue">AL</span>
          <span className="tiny-avatar green">SK</span>
        </span>
      </div>
      <div className="review-demo-body">
        <aside className="review-sidebar">
          <span className="eyebrow">Our product</span>
          <span>
            <Icon name="grid" /> All screens
          </span>
          <span className="sidebar-selected">
            <Icon name="branch" /> Changes
          </span>
          <div className="sidebar-tree">
            <strong>Website launch</strong>
            <span className="tree-active">
              Overview <i />
            </span>
            <span>Task details</span>
            <span>Project settings</span>
          </div>
          <div className="sidebar-bottom">
            <span className="status-dot" /> A shared view for the team
          </div>
        </aside>
        <div className="review-stage">
          <div className="review-stage-top">
            <strong>Overview</strong>
            <div className="segmented" role="group" aria-label="Design version">
              <button type="button" data-version="before" aria-pressed="false">
                Before
              </button>
              <button type="button" data-version="after" aria-pressed="true">
                After
              </button>
            </div>
          </div>
          <div data-review-before hidden>
            <ProjectScreen revised={false} />
          </div>
          <div data-review-after>
            <ProjectScreen />
          </div>
          <div className="review-stage-bottom">
            <Icon name="desktop" />
            <span role="status" data-review-state>
              Updated design
            </span>
            <span className="review-ready">
              <Icon name="check" /> Ready for a closer look
            </span>
          </div>
        </div>
        <aside className="review-comments">
          <div className="comment-heading">
            <strong>The conversation</strong>
            <Icon name="comment" />
          </div>
          <div className="review-comment">
            <span className="tiny-avatar blue">AL</span>
            <div>
              <strong>Alex Lee</strong>
              <small>Product</small>
              <p>Can we make the next step easier to spot?</p>
            </div>
          </div>
          <div className="comment-line" />
          <div className="review-comment">
            <span className="tiny-avatar amber">JD</span>
            <div>
              <strong>Jamie Davis</strong>
              <small>Engineering</small>
              <p>
                Moved it up beside the title. Same button, a little more focus.
              </p>
              <span className="comment-resolved">
                <Icon name="check" /> Looks good to me
              </span>
            </div>
          </div>
          <div className="comment-note">
            <span className="note-pin">✳</span>
            <p>
              Less back and forth.
              <br />
              More moving forward.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
