#!/usr/bin/env node
/**
 * expo run:ios only installs the iPhone app. This rebuilds the watch
 * companion and pushes it when Developer Mode + DDI are up.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const BUNDLE_ID = "app.ethiohome.companion.watchkitapp";
const TEAM = "33U636X6U6";
const CONFIGURATION =
  process.env.WATCH_CONFIGURATION === "Debug" ? "Debug" : "Release";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`\nWatch companion was not installed.\n${message}\n`);
  process.exit(1);
}

function listDevices() {
  const dir = mkdtempSync(join(tmpdir(), "ethio-watch-"));
  const jsonPath = join(dir, "devices.json");
  try {
    execFileSync(
      "xcrun",
      ["devicectl", "list", "devices", "--json-output", jsonPath, "--timeout", "8"],
      { stdio: "pipe" },
    );
    return JSON.parse(readFileSync(jsonPath, "utf8")).result.devices ?? [];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function watchFrom(devices) {
  return devices.find((device) => device.hardwareProperties?.deviceType === "appleWatch");
}

function watchAppPath() {
  const derivedRoot = join(process.env.HOME ?? "", "Library/Developer/Xcode/DerivedData");
  const folders = existsSync(derivedRoot)
    ? readdirSync(derivedRoot).filter((name) => name.startsWith("EthioHome-"))
    : [];
  const candidates = [
    join(ROOT, "ios/build", `${CONFIGURATION}-watchos`, "EthioWatch.app"),
    join(ROOT, "ios/build/Release-watchos/EthioWatch.app"),
  ];
  for (const folder of folders) {
    const products = join(derivedRoot, folder, "Build/Products");
    candidates.push(
      join(products, `${CONFIGURATION}-watchos`, "EthioWatch.app"),
      join(products, `${CONFIGURATION}-iphoneos`, "EthioHome.app", "Watch", "EthioWatch.app"),
    );
  }
  return candidates.find((path) => existsSync(path));
}

function rebuildWatch() {
  console.log("Building EthioWatch…");
  const result = spawnSync(
    "xcodebuild",
    [
      "-project",
      join(ROOT, "ios/EthioHome.xcodeproj"),
      "-target",
      "EthioWatch",
      "-sdk",
      "watchos",
      "-configuration",
      CONFIGURATION,
      "-allowProvisioningUpdates",
      "-allowProvisioningDeviceRegistration",
      `DEVELOPMENT_TEAM=${TEAM}`,
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0 || !output.includes("BUILD SUCCEEDED")) {
    process.stdout.write(output);
    fail("Watch build failed.");
  }
}

function uninstallWatch(deviceId) {
  console.log("Clearing a stuck watch install…");
  spawnSync(
    "xcrun",
    [
      "devicectl",
      "device",
      "uninstall",
      "app",
      "--device",
      deviceId,
      BUNDLE_ID,
      "--timeout",
      "30",
    ],
    { encoding: "utf8" },
  );
}

function installWatch(deviceId, app) {
  return spawnSync(
    "xcrun",
    [
      "devicectl",
      "device",
      "install",
      "app",
      "--device",
      deviceId,
      app,
      "--timeout",
      "90",
    ],
    { encoding: "utf8" },
  );
}

function isCoordinatorConflict(output) {
  return (
    output.includes("coordinated install") ||
    output.includes("IXErrorDomain error 48") ||
    output.includes("scoped to a different process")
  );
}

function isAsleep(output) {
  return (
    output.includes("Could not allocate a resource") ||
    output.includes("connection to this device could not be established") ||
    output.includes("0xE8000003") ||
    output.includes("error 4000")
  );
}

const devices = listDevices();
const watch = watchFrom(devices);
if (!watch) {
  console.log("No paired Apple Watch — skipping watch install.");
  process.exit(0);
}

const name = watch.deviceProperties?.name ?? "Apple Watch";
const developerMode = watch.deviceProperties?.developerModeStatus;
const ddi = watch.deviceProperties?.ddiServicesAvailable === true;
const id = watch.identifier;
if (!id) fail(`Could not read an identifier for ${name}.`);

if (developerMode !== "enabled") {
  fail(
    `${name}: turn on Developer Mode (Watch Settings → Privacy & Security → Developer Mode), unlock the watch, then run this again.`,
  );
}

if (!ddi) {
  fail(
    `${name} is paired and Developer Mode is on, but Xcode has not prepared it yet (no developer disk image).\n` +
      "Unlock the watch, keep it near the iPhone, then in Xcode open Window → Devices and Simulators, select the watch, and wait until it finishes preparing.\n" +
      "After the watch shows as connected (not “no DDI”), run: pnpm watch:install",
  );
}

rebuildWatch();
const app = watchAppPath();
if (!app) fail("Watch build produced no EthioWatch.app.");

console.log(`Installing watch companion on ${name}…`);
console.log("Keep the watch unlocked and the screen on. Do not run this while Xcode is also installing.");

// A leftover install from Xcode / a timed-out `pnpm ios` owns this
// identity until we uninstall (IXErrorDomain 48).
uninstallWatch(id);
await sleep(1500);

let install = installWatch(id, app);
let output = `${install.stdout ?? ""}\n${install.stderr ?? ""}`;
if (install.status !== 0 && isCoordinatorConflict(output)) {
  process.stdout.write(output);
  uninstallWatch(id);
  await sleep(2000);
  console.log("Retrying install…");
  install = installWatch(id, app);
  output = `${install.stdout ?? ""}\n${install.stderr ?? ""}`;
}

if (install.status !== 0) {
  process.stdout.write(output);
  if (isAsleep(output)) {
    fail(
      `${name} is reachable but asleep or locked, so the install tunnel died.\n` +
        "Raise the watch, enter the passcode, keep the screen on, and run `pnpm watch:install` again while looking at the watch.",
    );
  }
  if (isCoordinatorConflict(output)) {
    fail(
      "Another installer still owns this watch app (Xcode or a previous `pnpm ios`). Quit Xcode’s install, wait a few seconds, unlock the watch, and run `pnpm watch:install` again.",
    );
  }
  fail("Install failed. Unlock the watch and try `pnpm watch:install` once more.");
}

console.log("Watch companion installed. Open Ethio Home on the wrist once.");
