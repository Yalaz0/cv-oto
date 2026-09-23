import { execFile, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const supabaseEntry = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url),
);
const playwrightEntry = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);

const { stdout } = await execFileAsync(
  process.execPath,
  [supabaseEntry, "status", "-o", "env"],
  { env: { ...process.env, SUPABASE_DISABLE_TELEMETRY: "1" } },
);
const localEnvironment = Object.fromEntries(
  stdout
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^"|"$/g, "")]),
);
localEnvironment.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3000";
localEnvironment.NEXT_PUBLIC_SUPABASE_URL = localEnvironment.API_URL;
localEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY = localEnvironment.ANON_KEY;
if (
  !localEnvironment.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ||
  !localEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  throw new Error(
    "Local Supabase environment is unavailable. Run `pnpm db:start` first.",
  );
}

const result = await new Promise((resolve, reject) => {
  const child = spawn(
    process.execPath,
    [playwrightEntry, "test", "-c", "playwright.local.config.ts"],
    { stdio: "inherit", env: { ...process.env, ...localEnvironment } },
  );
  child.on("error", reject);
  child.on("exit", (code) => resolve(code ?? 1));
});
process.exitCode = result;
