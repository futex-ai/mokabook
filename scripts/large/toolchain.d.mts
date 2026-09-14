export function prepareDerivedToolchain(
  repository: string,
  root: string,
  run?: (
    executable: string,
    argv: readonly string[],
    options: { cwd: string; maxBuffer: number; timeout?: number },
  ) => Promise<{ stdout: string; stderr: string }>,
): Promise<void>;
