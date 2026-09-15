import { MoklyError, type MoklyErrorCode } from "../errors.js";

import type { UploadOptions } from "./types.js";

const REJECTIONS: Readonly<Record<number, readonly [MoklyErrorCode, string]>> =
  {
    400: [
      "upload-invalid-bundle",
      "The service rejected the catalogue bundle. Check its upload requirements.",
    ],
    422: [
      "upload-invalid-bundle",
      "The service rejected the catalogue bundle. Check its upload requirements.",
    ],
    401: [
      "upload-unauthorized",
      "The service denied the upload. Check your token and repository access.",
    ],
    403: [
      "upload-unauthorized",
      "The service denied the upload. Check your token and repository access.",
    ],
    413: [
      "upload-too-large",
      "The catalogue exceeds the service's upload limit. Reduce its size or increase the service quota.",
    ],
    426: [
      "upload-unsupported-version",
      "The service does not support this upload version. Update Mokly or the receiver.",
    ],
  };

/** Upload once through an injectable fetch boundary; never echo remote diagnostics. */
export async function uploadCatalogue(
  options: UploadOptions,
  body: Buffer,
  request: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<void> {
  const timeout = AbortSignal.timeout(120_000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response: Response;
  try {
    combined.throwIfAborted();
    response = await request(options.endpoint, {
      method: "POST",
      redirect: "manual",
      signal: combined,
      headers: {
        Authorization: `Bearer ${options.token}`,
        "Content-Type": "application/gzip",
        Accept: "application/json",
        "Content-Length": String(body.length),
      },
      body: body as Buffer<ArrayBuffer>,
    });
  } catch {
    throw new MoklyError(
      "upload-failed",
      "Upload failed or was interrupted. Check the endpoint and connection before retrying.",
    );
  }
  await response.body?.cancel().catch(() => undefined);
  if (response.ok) return;
  const [code, message] = REJECTIONS[response.status] ?? [
    "upload-failed",
    "The service did not accept the upload. Check its status and endpoint before retrying.",
  ];
  throw new MoklyError(code, message);
}
