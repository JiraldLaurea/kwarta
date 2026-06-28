import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.DATABASE_URL) {
  run("npx", ["prisma", "migrate", "deploy"]);
}

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
run(process.execPath, [nextBin, "build"]);
