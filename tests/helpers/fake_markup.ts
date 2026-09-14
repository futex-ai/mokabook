/** A minimal element factory for client renderers that only create and append
 * nodes, so unit tests can assert the exact copy and markup they produce. */

/** One created element of the fake tree. */
export class FakeMarkupElement {
  className = "";
  hidden = false;
  own = "";
  readonly children: FakeMarkupElement[] = [];

  constructor(
    readonly tag: string,
    readonly ownerDocument: FakeMarkupDocument,
  ) {}

  get textContent(): string {
    return this.children.reduce(
      (text, child) => text + child.textContent,
      this.own,
    );
  }

  set textContent(value: string) {
    this.own = value;
    this.children.length = 0;
  }

  append(...nodes: readonly FakeMarkupElement[]): void {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: readonly FakeMarkupElement[]): void {
    this.children.length = 0;
    this.children.push(...nodes);
  }
}

/** The `createElement` subset the evidence renderers depend on. */
export class FakeMarkupDocument {
  createElement(tag: string): FakeMarkupElement {
    return new FakeMarkupElement(tag, this);
  }
}

/** Serialize a fake element's children so tests can assert exact markup. */
export function fakeMarkup(node: FakeMarkupElement): string {
  return node.children.map(serialize).join("");
}

function serialize(node: FakeMarkupElement): string {
  const attributes = node.className ? ` class="${node.className}"` : "";
  return `<${node.tag}${attributes}>${node.own}${node.children
    .map(serialize)
    .join("")}</${node.tag}>`;
}
