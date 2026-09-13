import { concepts } from "./concepts.js";

function initializeGallery() {
  const frame = document.querySelector<HTMLIFrameElement>(
    "[data-preview-frame]",
  );
  const stage = document.querySelector<HTMLElement>("[data-preview-stage]");
  const window = document.querySelector<HTMLElement>("[data-preview-window]");
  if (!frame || !stage || !window) return;
  let selected: (typeof concepts)[number] = concepts[0];
  let viewport: "desktop" | "mobile" = "desktop";

  const resize = () => {
    const width = viewport === "mobile" ? 390 : 1160;
    const height = viewport === "mobile" ? 844 : 780;
    const padding = Number.parseFloat(getComputedStyle(stage).paddingLeft) * 2;
    const scale = Math.min(1, (stage.clientWidth - padding) / width);
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    frame.style.transform = `scale(${scale})`;
    window.style.width = `${width * scale}px`;
    window.style.height = `${height * scale}px`;
    stage.dataset["mode"] = viewport;
    frame.title = `${selected.name} website — ${viewport} preview`;
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  for (const thumbnail of document.querySelectorAll<HTMLElement>(
    "[data-thumbnail]",
  )) {
    new ResizeObserver(() =>
      thumbnail.style.setProperty(
        "--thumbnail-scale",
        String(thumbnail.clientWidth / 1280),
      ),
    ).observe(thumbnail);
  }

  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-viewport]",
  )) {
    button.addEventListener("click", () => {
      viewport = button.dataset["viewport"] === "mobile" ? "mobile" : "desktop";
      for (const other of document.querySelectorAll("[data-viewport]"))
        other.setAttribute("aria-pressed", String(other === button));
      resize();
    });
  }

  const setText = (selector: string, value: string) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-concept]",
  )) {
    button.addEventListener("click", () => {
      const concept = concepts.find(
        (candidate) => candidate.id === button.dataset["concept"],
      );
      if (!concept) return;
      selected = concept;
      frame.src = concept.path;
      for (const other of document.querySelectorAll("[data-concept]"))
        other.setAttribute("aria-pressed", String(other === button));
      setText("[data-selected-name]", concept.name);
      setText("[data-selected-number]", `${concept.number} / 03`);
      setText("[data-selected-audience]", concept.audience);
      setText("[data-selected-status]", concept.status);
      setText("[data-selected-focus]", concept.focus);
      for (const link of document.querySelectorAll<HTMLAnchorElement>(
        "[data-open-concept], [data-download-concept]",
      ))
        link.href = concept.path;
      const dot = document.querySelector<HTMLElement>("[data-selection-dot]");
      if (dot)
        dot.style.background = {
          fieldnotes: "#be714b",
          signal: "#739451",
          "common-ground": "#9276ad",
        }[concept.id];
      resize();
      document.querySelector("#compare")?.scrollIntoView({ block: "start" });
    });
  }
}

function initializeDemos() {
  const agentButton = document.querySelector<HTMLButtonElement>(
    "[data-agent-toggle]",
  );
  agentButton?.addEventListener("click", () => {
    const revised = agentButton.getAttribute("aria-pressed") !== "true";
    agentButton.setAttribute("aria-pressed", String(revised));
    agentButton.firstChild!.textContent = revised
      ? "Back to the original"
      : "Show the update";
    const before = document.querySelector<HTMLElement>("[data-agent-before]");
    const after = document.querySelector<HTMLElement>("[data-agent-after]");
    const state = document.querySelector("[data-agent-state]");
    const message = document.querySelector("[data-agent-message]");
    if (before) before.hidden = revised;
    if (after) after.hidden = !revised;
    if (state)
      state.textContent = revised ? "Updated design" : "Current design";
    if (message)
      message.textContent = revised
        ? "The next step is right beside the title."
        : "Good context makes a better starting point.";
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-version]",
  )) {
    button.addEventListener("click", () => {
      const revised = button.dataset["version"] === "after";
      for (const other of document.querySelectorAll("[data-version]"))
        other.setAttribute("aria-pressed", String(other === button));
      const before = document.querySelector<HTMLElement>(
        "[data-review-before]",
      );
      const after = document.querySelector<HTMLElement>("[data-review-after]");
      const state = document.querySelector("[data-review-state]");
      if (before) before.hidden = revised;
      if (after) after.hidden = !revised;
      if (state)
        state.textContent = revised ? "Updated design" : "Original design";
    });
  }
}

function initializeCopy() {
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-copy]",
  )) {
    button.addEventListener("click", async () => {
      const command = button.dataset["copy"];
      if (!command) return;
      const label = button.querySelector("[data-copy-label]");
      const status = button.parentElement?.querySelector("[data-copy-status]");
      try {
        await navigator.clipboard.writeText(command);
        if (label) label.textContent = "Copied";
        if (status) status.textContent = "Install command copied.";
      } catch {
        const code = button.parentElement?.querySelector("code");
        if (code) {
          const range = document.createRange();
          range.selectNodeContents(code);
          const selection = globalThis.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        if (label) label.textContent = "Selected";
        if (status)
          status.textContent =
            "Command selected. Use your browser’s Copy command to copy it.";
      }
    });
  }
}

initializeGallery();
initializeDemos();
initializeCopy();
