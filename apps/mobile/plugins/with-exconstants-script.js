const { execSync } = require("child_process");
const { createRunOncePlugin, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs/promises");
const path = require("path");

const PODFILE_MARKER = "# ethio: skip login shell for EXConstants";

const PODFILE_SNIPPET = [
  "",
  `    ${PODFILE_MARKER}`,
  "    # bash -l -c copies Xcode's env into a login shell. pnpm's hashed",
  "    # paths already overflow ARG_MAX, so exec of get-app-config-ios.sh",
  "    # fails with \"Argument list too long\". NODE_BINARY is resolved at",
  "    # pod install and prepended to PATH; .xcode.env does the rest.",
  "    node_dir = File.dirname(`command -v node`.strip)",
  "    installer.pods_project.targets.each do |target|",
  "      target.shell_script_build_phases.each do |phase|",
  '        next unless phase.shell_script&.include?("bash -l -c")',
  "        phase.shell_script = <<~SCRIPT",
  '          export PATH="#{node_dir}:$PATH"',
  '          #{phase.shell_script.sub(/bash -l -c\\s+/, "bash ")}',
  "        SCRIPT",
  "      end",
  "    end",
  "",
].join("\n");

function nodeBinDir() {
  return path.dirname(execSync("command -v node", { encoding: "utf8" }).trim());
}

function withSkipLoginShell(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const root = modConfig.modRequest.platformProjectRoot;
      const podfilePath = path.join(root, "Podfile");
      let podfile = await fs.readFile(podfilePath, "utf8");
      if (!podfile.includes(PODFILE_MARKER)) {
        const needle =
          /(:ccache_enabled => ccache_enabled\(podfile_properties\),\n    \)\n)/;
        if (!needle.test(podfile)) {
          throw new Error(
            "Podfile shape changed; cannot patch login-shell script phases",
          );
        }
        podfile = podfile.replace(needle, `$1${PODFILE_SNIPPET}`);
        await fs.writeFile(podfilePath, podfile);
      }

      const nodeDir = nodeBinDir();
      const entries = await fs.readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.endsWith(".xcodeproj")) continue;
        if (entry.name === "Pods.xcodeproj") continue;
        const pbx = path.join(root, entry.name, "project.pbxproj");
        let contents = await fs.readFile(pbx, "utf8");
        if (!contents.includes("bash -l -c")) continue;
        contents = contents.replaceAll(
          "bash -l -c ",
          `export PATH=\\"${nodeDir}:$PATH\\"\\nbash `,
        );
        // bash -c treated backslash-space as an escape. bash <file> does not.
        contents = contents.replaceAll(
          '\\"./Pods/Target\\\\ Support\\\\ Files/',
          '\\"$SRCROOT/Pods/Target Support Files/',
        );
        await fs.writeFile(pbx, contents);
      }
      return modConfig;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withSkipLoginShell,
  "with-skip-login-shell",
  "1.1.0",
);
