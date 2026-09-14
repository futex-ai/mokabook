import { fileExportOperations } from "../../dist/export/operations.js";

/** Process-isolated fault injection for exercising the real CLI error output. */
const mode = process.env["MOKLY_TEST_EXPORT_FAILURE"];
const originalRename = fileExportOperations.rename;
const originalRmdir = fileExportOperations.rmdir;

fileExportOperations.rename = async (from, to) => {
  if (mode === "rollback" && from.endsWith("/stage"))
    throw new Error("Injected install failure");
  if (mode === "rollback" && from.endsWith("/backup"))
    throw new Error("Injected restore failure");
  await originalRename(from, to);
  if (mode === "cancellation" && to.endsWith("/backup"))
    process.emit("SIGTERM");
};

fileExportOperations.rmdir = async (candidate) => {
  if (mode === "backup" && candidate.endsWith("/backup"))
    throw new Error("Injected backup cleanup failure");
  await originalRmdir(candidate);
};

if (mode === "cancellation" || mode === "cleanup") {
  fileExportOperations.remove = async () => {
    throw new Error("Injected reservation cleanup failure");
  };
}
