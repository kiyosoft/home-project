#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * `/usr/local/bin` is ahead of Homebrew on this machine, so `pod` is the
 * system Ruby 1.16.2 gem. Podfile.lock and current Xcode need 1.17.0.
 */
const homebrewBin = "/opt/homebrew/bin";
const path = process.env.PATH ?? "";
const env = {
  ...process.env,
  PATH: existsSync(join(homebrewBin, "pod"))
    ? `${homebrewBin}:${path}`
    : path,
};

const expo = spawnSync("npx", ["expo", "run:ios", ...args], {
  cwd: root,
  stdio: "inherit",
  env,
});
if (expo.status) process.exit(expo.status);

if (!args.includes("--device") && !args.includes("-d")) process.exit(0);

const configuration = args.includes("Release") ? "Release" : "Debug";
const watch = spawnSync(process.execPath, [join(root, "scripts/install-watch-companion.mjs")], {
  cwd: root,
  stdio: "inherit",
  env: { ...env, WATCH_CONFIGURATION: configuration },
});
process.exit(watch.status ?? 0);
