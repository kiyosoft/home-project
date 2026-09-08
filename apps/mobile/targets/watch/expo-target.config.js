/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "watch",
  name: "EthioWatch",
  displayName: "Ethio Home",
  bundleIdentifier: ".watchkitapp",
  deploymentTarget: "10.0",
  frameworks: [
    "SwiftUI",
    "WatchConnectivity",
    "CoreMotion",
    "CoreLocation",
    "WatchKit",
  ],
};
