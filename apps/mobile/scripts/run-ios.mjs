#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const expo = spawnSync("npx", ["expo", "run:ios", ...args], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
if (expo.status) process.exit(expo.status);

if (!args.includes("--device") && !args.includes("-d")) process.exit(0);

const configuration = args.includes("Release") ? "Release" : "Debug";
const watch = spawnSync(process.execPath, [join(root, "scripts/install-watch-companion.mjs")], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, WATCH_CONFIGURATION: configuration },
});
process.exit(watch.status ?? 0);
