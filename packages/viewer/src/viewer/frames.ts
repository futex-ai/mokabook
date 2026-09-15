import type { CatalogueReadModel } from "../catalogue/types.js";
import type {
  FrameAdapter,
  FrameEvent,
  FrameNavigation,
} from "../client/frame_adapter.js";
import { cancelFrameMount } from "../client/frame_mount.js";

import { renderFrameLabels } from "./frame_labels.js";
import { frameSession } from "./frame_session.js";
import type { Session } from "./frame_session.js";
import { frameDescriptors, frameInstance, hasInstance } from "./frame_views.js";
import type { ViewerFrame } from "./frame_views.js";
import { Picking } from "./picking.js";
import type {
  InstanceRef,
  PickEnd,
  ViewerEvents,
  ViewerSelection,
} from "./types.js";

export class ViewerFrames {
  private sessions: Session[] = [];
  private disposed = false;
  private pick: Picking;
  private epoch = 0;
  private highlighted: string | undefined;
  private activeHighlight = false;
  private choose:
    ((key: string, viewport: "mobile" | "desktop") => void) | undefined;
  constructor(
    private root: HTMLElement,
    private model: CatalogueReadModel,
    private origin: URL,
    private adapter: FrameAdapter,
    private events: () => ViewerEvents,
    private navigate: (event: FrameNavigation) => void,
    private selection: ViewerSelection,
    private report: (error: unknown) => Error,
  ) {
    this.pick = new Picking(
      events,
      () => !this.disposed,
      () => {
        this.activeHighlight = false;
        void this.off().catch(() => {});
      },
      report,
    );
  }
  update(
    selection: ViewerSelection,
    variant?: string,
    fragment?: string,
  ): void {
    this.selection = selection;
    const frames = frameDescriptors(this.root, this.model, selection, variant);
    if (
      this.sessions.length === frames.length &&
      this.sessions.every(
        (session, i) =>
          session.frame.element === frames[i]?.element &&
          session.frame.view === frames[i]?.view &&
          session.frame.element.dataset["viewerFragment"] === (fragment ?? ""),
      )
    )
      return;
    this.clear();
    for (const frame of frames) {
      frame.element.dataset["viewerFragment"] = fragment ?? "";
      const url = new URL(
        frame.path.split("/").map(encodeURIComponent).join("/"),
        this.origin,
      );
      if (fragment) url.hash = fragment;
      this.sessions.push(
        frameSession(
          frame,
          url,
          this.adapter,
          (event) => this.receive(frame, event),
          (error) => this.fail(error),
        ),
      );
    }
  }
  private receive(frame: ViewerFrame, event: FrameEvent): void {
    if (this.disposed) return;
    if (event.type === "navigation") {
      this.navigate(event.navigation);
      return;
    }
    if (event.type === "pick-end") {
      this.end({ reason: "escape" });
      return;
    }
    if (event.type === "error") {
      this.fail();
      return;
    }
    if (event.type === "geometry") {
      if (this.activeHighlight) void this.labels().catch(() => this.fail());
      return;
    }
    if (event.key !== null && !hasInstance(frame.view?.usage, event.key)) {
      this.fail();
      return;
    }
    const instance =
      event.key === null ? null : frameInstance(frame, event.key);
    const detail = {
      instance,
      boxes: event.boxes,
      frame: {
        entryId: this.selection.screenId ?? frame.entry.id,
        ...(frame.stepIndex !== undefined
          ? { stepIndex: frame.stepIndex }
          : {}),
      },
    };
    if (event.type === "hover") this.events().onInstanceHover?.(detail);
    else if (instance) {
      this.events().onInstanceClick?.(detail);
      if (this.pick.active) this.end({ reason: "selected", instance });
      this.choose?.(instance.key, instance.viewport);
    }
  }
  private fail(error: unknown = new Error("Frame unavailable")): Error {
    this.end({ reason: "error" });
    return this.report(error);
  }
  private async current(): Promise<Session[]> {
    if (this.disposed) throw new Error("The viewer is no longer available.");
    if (
      this.root
        .querySelector('[data-diff-mode][aria-pressed="true"]')
        ?.getAttribute("data-diff-mode") !== undefined &&
      !this.root.querySelector(
        '[data-diff-mode="current"][aria-pressed="true"]',
      )
    )
      throw new Error("Choose Current to inspect this view.");
    const sessions = this.sessions.slice(),
      epoch = this.epoch;
    await Promise.all(sessions.map((session) => session.ready));
    if (this.disposed || epoch !== this.epoch)
      throw new Error("The selected view changed.");
    return sessions;
  }
  private async referenced(instance: InstanceRef): Promise<Session> {
    const sessions = await this.current();
    const match = sessions.find(
      ({ frame }) =>
        frame.entry.id === instance.screenId &&
        frame.variantId === instance.variantId &&
        frame.view?.viewport === instance.viewport &&
        frame.view?.colorScheme === instance.colorScheme &&
        hasInstance(frame.view?.usage, instance.key),
    );
    if (!match)
      throw new Error("This instance is unavailable in the current view.");
    return match;
  }
  async highlight(instance: InstanceRef | null): Promise<void> {
    if (this.disposed) throw new Error("The viewer is no longer available.");
    if (instance) {
      const session = await this.referenced(instance);
      await Promise.all(
        (await this.current()).map((other) =>
          other.mounted!.highlight(
            other === session ? [instance.key] : [],
            other === session ? "highlight" : "off",
          ),
        ),
      );
      this.highlighted = instance.key;
      this.activeHighlight = true;
      await this.labels();
    } else {
      this.activeHighlight = false;
      this.highlighted = undefined;
      await this.off();
    }
  }
  async scroll(instance: InstanceRef): Promise<void> {
    const session = await this.referenced(instance);
    await session.mounted!.scrollTo(instance.key);
  }
  startPick(): Promise<void> {
    return this.pick.start(async (valid) => {
      const sessions = await this.current();
      if (
        !sessions.length ||
        sessions.some(({ frame }) => frame.view?.usage.status !== "ready")
      )
        throw new Error("Component inspection is unavailable in this view.");
      if (!valid()) throw new Error("Picking was cancelled.");
      await this.show("pick");
      if (valid()) this.root.focus({ preventScroll: true });
    });
  }
  end(event: PickEnd): void {
    this.pick.end(event);
  }
  workspaceHighlight(
    selected: string | undefined,
    choose: (key: string, viewport: "mobile" | "desktop") => void,
  ): () => void {
    this.choose = choose;
    this.highlighted = selected;
    void this.show(this.pick.active ? "pick" : "highlight").catch(() =>
      this.fail(),
    );
    return () => {
      this.choose = undefined;
      if (!this.pick.active) {
        this.activeHighlight = false;
        void this.off().catch(() => {});
      }
    };
  }
  workspaceReveal(key: string, viewport: "mobile" | "desktop"): void {
    const frame = this.sessions.find(
      (session) =>
        session.frame.view?.viewport === viewport &&
        hasInstance(session.frame.view?.usage, key),
    )?.frame;
    if (frame)
      void this.scroll(frameInstance(frame, key)).catch(() => this.fail());
  }
  private async show(mode: "pick" | "highlight"): Promise<void> {
    const sessions = await this.current();
    this.activeHighlight = true;
    await Promise.all(
      sessions.map(({ frame, mounted }) =>
        mounted!.highlight(
          frame.view?.usage.status === "ready"
            ? frame.view?.usage.instances
                .filter((instance) =>
                  this.highlighted
                    ? instance.key === this.highlighted
                    : instance.owner.kind === "entry",
                )
                .map((instance) => instance.key)
            : [],
          mode,
        ),
      ),
    );
    await this.labels();
  }
  private async off(): Promise<void> {
    this.root.querySelector("[data-mokly-label-layer]")?.replaceChildren();
    await Promise.all(
      this.sessions.map((session) => session.mounted?.highlight([], "off")),
    );
  }
  private async labels(): Promise<void> {
    const sessions = await this.current(),
      epoch = this.epoch;
    await renderFrameLabels(
      this.root,
      sessions,
      this.model,
      this.highlighted,
      () => this.activeHighlight && !this.disposed && epoch === this.epoch,
      (frame, event) => this.receive(frame, event),
    );
  }

  private clear(): void {
    this.epoch++;
    for (const session of this.sessions) {
      session.controller.abort();
      session.unsubscribe?.();
      session.mounted?.dispose();
      cancelFrameMount(session.frame.element);
    }
    this.sessions = [];
    this.root.querySelector("[data-mokly-label-layer]")?.replaceChildren();
  }
  dispose(reason?: "source-change"): void {
    if (reason) this.end({ reason });
    this.disposed = true;
    this.pick.end();
    this.clear();
  }
}
