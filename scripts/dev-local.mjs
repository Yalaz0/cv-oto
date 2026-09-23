import { execFile, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const supabaseEntry = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url),
);
const nextEntry = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const { stdout } = await execFileAsync(process.execPath, [
  supabaseEntry,
  "status",
  "-o",
  "env",
]);
const values = Object.fromEntries(
  stdout
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^"|"$/g, "")]),
);
const child = spawn(
  process.execPath,
  [nextEntry, "dev", "--hostname", "127.0.0.1"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      NEXT_PUBLIC_SUPABASE_URL: values.API_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: values.ANON_KEY,
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
