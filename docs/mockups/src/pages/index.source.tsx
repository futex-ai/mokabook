import { concepts } from "../concepts.js";
import { BrandMark, Icon } from "../components/icons.js";

export function ReviewGallery() {
  const first = concepts[0];
  return (
    <div className="gallery" id="top">
      <header className="gallery-header">
        <a className="brand" href="#top">
          <BrandMark />
          <span>
            mokabook<span className="brand-period">.</span>
          </span>
        </a>
        <span>
          WEBSITE EXPLORATIONS <span className="gallery-header-rule" /> 01—03
        </span>
      </header>
      <main>
        <section className="gallery-intro">
          <div>
            <span className="eyebrow">Three directions. One product.</span>
            <h1>
              A few ways to
              <br />
              tell the story<span>.</span>
            </h1>
          </div>
          <div>
            <p>
              Mokabook turns design intent into a shared picture of the product.
              These three website concepts explore who we speak to—and how it
              should feel.
            </p>
            <span className="gallery-scope">
              Design concepts for review. No live signup, customer claims, or
              invented pricing.
            </span>
          </div>
        </section>
        <section
          className="concept-grid"
          aria-label="Choose a website direction"
        >
          {concepts.map((concept) => (
            <article
              className={`concept-card concept-${concept.id}`}
              key={concept.id}
            >
              <a
                className="concept-thumbnail"
                data-thumbnail
                href={concept.path}
                aria-label={`Open ${concept.name} website`}
              >
                <iframe
                  src={concept.path}
                  title={`${concept.name} website thumbnail`}
                  tabIndex={-1}
                  inert
                  loading="lazy"
                />
                <span className="thumbnail-open">
                  <Icon name="arrow" />
                </span>
              </a>
              <div className="concept-card-body">
                <span className="concept-number">
                  DIRECTION {concept.number}
                </span>
                <h2>{concept.name}</h2>
                <span className="concept-tone">{concept.tone}</span>
                <p>{concept.description}</p>
                <div className="concept-card-actions">
                  <button
                    type="button"
                    data-concept={concept.id}
                    aria-pressed={concept.id === first.id}
                  >
                    Compare this direction
                    <Icon name="arrow" />
                  </button>
                  <a
                    href={concept.path}
                    aria-label={`Open full ${concept.name} website`}
                  >
                    ↗
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
        <section
          className="compare-section"
          id="compare"
          aria-labelledby="compare-heading"
        >
          <div className="compare-heading">
            <div>
              <span className="eyebrow">Take a closer look</span>
              <h2 id="compare-heading">The website, at your size.</h2>
            </div>
            <p>
              Switch directions above. Explore each website below
              <br />
              or open the full page in your browser.
            </p>
          </div>
          <div className="review-toolbar">
            <span className="selected-concept">
              <span className="selection-dot" data-selection-dot />
              <strong data-selected-name>{first.name}</strong>
              <span data-selected-number>01 / 03</span>
            </span>
            <div
              className="viewport-controls"
              role="group"
              aria-label="Preview viewport"
            >
              <button type="button" data-viewport="desktop" aria-pressed="true">
                <Icon name="desktop" />
                <span>Desktop</span>
              </button>
              <button type="button" data-viewport="mobile" aria-pressed="false">
                <Icon name="mobile" />
                <span>Mobile</span>
              </button>
            </div>
            <a href={first.path} data-open-concept>
              Open full page <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="preview-stage" data-preview-stage>
            <div className="preview-window" data-preview-window>
              <iframe
                src={first.path}
                title="Fieldnotes website — desktop preview"
                data-preview-frame
              />
            </div>
          </div>
          <div className="concept-detail" aria-live="polite">
            <div>
              <span className="eyebrow">Who it speaks to</span>
              <p data-selected-audience>{first.audience}</p>
            </div>
            <div>
              <span className="eyebrow" data-selected-status>
                {first.status}
              </span>
              <p data-selected-focus>{first.focus}</p>
            </div>
            <a href={first.path} data-download-concept download>
              Save this HTML <Icon name="arrow" />
            </a>
          </div>
        </section>
        <section className="review-guidance">
          <span className="eyebrow">What to look for</span>
          <div>
            <h3>The promise</h3>
            <p>Does the headline explain a problem you want to own?</p>
          </div>
          <div>
            <h3>The audience</h3>
            <p>Would the right person recognise this as a tool for them?</p>
          </div>
          <div>
            <h3>The feeling</h3>
            <p>Which direction feels like a product you would trust?</p>
          </div>
        </section>
        <aside className="gallery-notes">
          <p>
            All product screens use illustrative fixtures. The Signal chat and
            Common Ground review workspace explore capabilities discussed in the
            attached strategy conversation. They do not represent working cloud
            or agent services.
          </p>
          <p>
            The desktop and mobile previews share each direction’s responsive
            screen component. Each full website embeds its styles, font, and
            interactions and works offline. Documentation and GitHub links open
            the real project online.
          </p>
        </aside>
      </main>
      <footer className="gallery-footer">
        <span>Mokabook / Website directions</span>
        <span>Made to compare, discuss, and take forward.</span>
      </footer>
    </div>
  );
}
