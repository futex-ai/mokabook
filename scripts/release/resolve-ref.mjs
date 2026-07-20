import { resolvePublishRef, writeWorkflowOutput } from "./context.mjs";

const ref = resolvePublishRef({
  eventName: process.env.RELEASE_EVENT ?? "",
  manualRef: process.env.MANUAL_REF ?? "",
  releaseCreated: process.env.RELEASE_CREATED ?? "",
  releaseTag: process.env.RELEASE_TAG ?? "",
});
writeWorkflowOutput("publish_ref", ref ?? "");
process.stdout.write(
  ref
    ? `Selected immutable release ${ref}.\n`
    : "No release artifact selected.\n",
);
