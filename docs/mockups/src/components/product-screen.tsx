import { Icon } from "./icons.js";

export function ProjectScreen({
  revised = true,
  compact = false,
}: {
  revised?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`project-screen ${compact ? "project-compact" : ""} ${revised ? "project-revised" : ""}`}
    >
      <div className="project-top">
        <span className="project-brand">
          <span className="orbit-mark">o</span> orbit
        </span>
        <span className="project-avatar">JD</span>
      </div>
      <div className="project-body">
        <div className="project-breadcrumb">
          Workspace <span>/</span> Website launch
        </div>
        <div className="project-title">
          <div>
            <span className="project-label">YOUR NEXT BIG THING</span>
            <h3>
              Website launch<span className="project-title-dot">.</span>
            </h3>
          </div>
          {revised && <span className="project-action">＋ New task</span>}
        </div>
        <p className="project-description">A little focus. A lot of forward.</p>
        <div className="project-tabs">
          <span className="active">Overview</span>
          <span>Tasks</span>
          <span>Files</span>
        </div>
        <div className="project-progress">
          <span>Let’s make it happen.</span>
          <span className="project-progress-note">
            Keep the good work moving.
          </span>
          <div className="progress-track">
            <span />
          </div>
          <div className="project-people">
            <span className="tiny-avatar amber">JD</span>
            <span className="tiny-avatar blue">AL</span>
            <span className="tiny-avatar green">SK</span>
            <small>Made for working together</small>
          </div>
        </div>
        <div className="project-task-heading">
          <strong>Up next</strong>
          <span>
            View all <span aria-hidden="true">↗</span>
          </span>
        </div>
        <div className="project-task">
          <span className="task-circle done">
            <Icon name="check" />
          </span>
          <span>Find our direction</span>
          <span className="task-chip done">Done</span>
        </div>
        <div className="project-task">
          <span className="task-circle" />
          <span>Make the first impression</span>
          <span className="task-chip">In progress</span>
        </div>
        <div className="project-task">
          <span className="task-circle" />
          <span>Bring it all together</span>
          <span className="tiny-avatar blue">AL</span>
        </div>
        {!revised && (
          <span className="project-action old-action">＋ New task</span>
        )}
      </div>
    </div>
  );
}

export function PhoneScreen() {
  return (
    <div className="phone-frame">
      <div className="phone-status">
        <span>9:41</span>
        <span className="phone-notch" />
        <span aria-hidden="true">▮▮▮ ▰</span>
      </div>
      <ProjectScreen compact />
      <div className="phone-home" />
    </div>
  );
}
