const fs = require("fs");
const path = require("path");
const { withDangerousMod, withInfoPlist } = require("expo/config-plugins");

const HUB_MARKER = "await WidgetHub.deliver(target: target)";
const HUB_ENUM_MARKER = "enum WidgetHub";
const SHARED_MARKER = "Function(\"setSharedString\")";

const PERFORM_GUARD = `  init(source: String?, target: String?, entryIndex: Int?, environmentString: String?) {
    self.source = source
    self.target = target
    self.entryIndex = entryIndex
    self.environmentString = environmentString
  }

  func perform() async throws -> some IntentResult {
    guard let source else {
      return .result()
    }`;

const PERFORM_DELIVER = `  init(source: String?, target: String?, entryIndex: Int?, environmentString: String?) {
    self.source = source
    self.target = target
    self.entryIndex = entryIndex
    self.environmentString = environmentString
  }

  func perform() async throws -> some IntentResult {
    ${HUB_MARKER}
    guard let source else {
      return .result()
    }`;

const SHARED_FUNCTIONS = `    Function("reloadAllWidgets") {
      WidgetCenter.shared.reloadAllTimelines()
    }

    Function("setSharedString") { (key: String, value: String) in
      WidgetsStorage.set(value, forKey: key)
    }

    Function("removeSharedString") { (key: String) in
      WidgetsStorage.removeObject(forKey: key)
    }`;

function expoWidgetsRoots(projectRoot) {
  const roots = new Set();
  try {
    roots.add(
      path.dirname(
        require.resolve("expo-widgets/package.json", { paths: [projectRoot] }),
      ),
    );
  } catch {
    // Package may not be resolvable during a partial install.
  }

  let dir = projectRoot;
  for (let i = 0; i < 6; i++) {
    const pnpm = path.join(dir, "node_modules/.pnpm");
    if (fs.existsSync(pnpm)) {
      for (const name of fs.readdirSync(pnpm)) {
        if (!name.startsWith("expo-widgets@")) continue;
        const pkg = path.join(pnpm, name, "node_modules/expo-widgets");
        if (fs.existsSync(path.join(pkg, "ios/Widgets/AppIntent.swift"))) {
          roots.add(pkg);
        }
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return [...roots];
}

function applyToRoot(root) {
  const hubSrc = fs
    .readFileSync(path.join(__dirname, "widget-hub/WidgetHub.swift"), "utf8")
    .trimEnd();

  const intentPath = path.join(root, "ios/Widgets/AppIntent.swift");
  let intent = fs.readFileSync(intentPath, "utf8");
  if (!intent.includes(HUB_MARKER)) {
    intent = intent.replace(PERFORM_GUARD, PERFORM_DELIVER);
  }
  if (!intent.includes(HUB_ENUM_MARKER)) {
    intent = `${intent.trimEnd()}\n\n${hubSrc}\n`;
  }
  fs.writeFileSync(intentPath, intent);

  const strayHub = path.join(root, "ios/Widgets/WidgetHub.swift");
  if (fs.existsSync(strayHub)) fs.unlinkSync(strayHub);

  const modulePath = path.join(root, "ios/WidgetsModule.swift");
  let module = fs.readFileSync(modulePath, "utf8");
  if (!module.includes(SHARED_MARKER)) {
    module = module.replace(
      `    Function("reloadAllWidgets") {
      WidgetCenter.shared.reloadAllTimelines()
    }`,
      SHARED_FUNCTIONS,
    );
    fs.writeFileSync(modulePath, module);
  }
}

function applyExpoWidgetsPatch(projectRoot) {
  for (const root of expoWidgetsRoots(projectRoot)) {
    applyToRoot(root);
  }
}

function ensureLocalNetworking(plist) {
  const existing = plist.NSAppTransportSecurity;
  const transport =
    existing && typeof existing === "object" ? { ...existing } : {};
  transport.NSAllowsLocalNetworking = true;
  plist.NSAppTransportSecurity = transport;
  return plist;
}

function withWidgetHub(config) {
  config = withDangerousMod(config, [
    "ios",
    async (mod) => {
      applyExpoWidgetsPatch(mod.modRequest.projectRoot);

      const infoPath = path.join(
        mod.modRequest.platformProjectRoot,
        "ExpoWidgetsTarget",
        "Info.plist",
      );
      if (fs.existsSync(infoPath)) {
        let xml = fs.readFileSync(infoPath, "utf8");
        if (!xml.includes("NSAllowsLocalNetworking")) {
          xml = xml.replace(
            "	<key>NSExtension</key>",
            `	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsLocalNetworking</key>
		<true/>
	</dict>
	<key>NSExtension</key>`,
          );
          fs.writeFileSync(infoPath, xml);
        }
      }
      return mod;
    },
  ]);

  return withInfoPlist(config, (mod) => {
    ensureLocalNetworking(mod.modResults);
    return mod;
  });
}

module.exports = withWidgetHub;
