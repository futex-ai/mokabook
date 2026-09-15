/** The headings of the documentation page, shared by its on-this-page list. */
export const SECTIONS = [
  { id: "install-the-package", title: "Install the package" },
  { id: "add-the-configuration", title: "Add the configuration" },
  { id: "author-your-first-screen", title: "Author your first screen" },
] as const;

/** The ruled on-this-page column beside the document. */
export function OnThisPage() {
  return (
    <nav aria-labelledby="on-this-page" className="site-onpage ed-onpage">
      <h2 className="ed-rubric" id="on-this-page">
        On this page
      </h2>
      <ol>
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`}>{section.title}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Previous and next, ruled rather than boxed, in sidebar order. */
export function EditorialPager() {
  return (
    <nav aria-label="Pagination" className="ed-pager">
      <span className="ed-pager-item">
        <span className="ed-rubric">
          <span aria-hidden="true">&#8592;</span> Previous
        </span>
        Getting started
      </span>
      <span className="ed-pager-item ed-pager-item--next">
        <span className="ed-rubric">
          Next <span aria-hidden="true">&#8594;</span>
        </span>
        Configure
      </span>
    </nav>
  );
}
