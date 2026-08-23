export const en = {
  "app.starting": "Starting Ethio Home…",

  "setup.connectTitle": "Connect Home Assistant",
  "setup.connectDescription":
    "Use a long-lived access token from your HA profile. Entity data stays on your network.",
  "setup.urlLabel": "Home Assistant URL",
  "setup.urlPlaceholder": "http://homeassistant.local:8123",
  "setup.tokenLabel": "Long-lived access token",
  "setup.tokenPlaceholder": "Paste token",
  "setup.connect": "Connect",
  "setup.connecting": "Connecting…",
  "setup.retry": "Retry",
  "setup.paste": "Paste",
  "setup.showToken": "Show token",
  "setup.hideToken": "Hide token",
  "setup.language": "Language",

  // Field-level verdicts. The address and the token fail independently, so the
  // screen says which half is wrong rather than showing one merged error.
  "setup.addressReachable": "Reachable",
  "setup.addressUnreachable": "Unreachable",
  "setup.tokenRejected": "Rejected",

  "setup.errorRequired":
    "Home Assistant URL and long-lived access token are required.",
  "setup.errorInvalidUrl":
    "Enter a valid URL, e.g. http://homeassistant.local:8123",
  "setup.errorUnreachable":
    "Nothing answered at that address. Check the hub is on and on this network.",
  "setup.errorTokenRejected":
    "The server answered, so the address is right. Paste a new long-lived access token from your HA profile.",
  "setup.errorConnectionLost": "The connection dropped before setup finished.",
  "setup.errorGeneric": "Could not reach Home Assistant.",

  "setup.demoTitle": "Try demo mode",
  "setup.demoDescription":
    "Explore a sample dashboard with simulated lights, switches, and sensors — no Home Assistant required.",
  "setup.startDemo": "Start demo",
  "setup.errorDemo": "Failed to start demo mode.",

  "home.placeholderTitle": "Connected",
  "home.placeholderDemo": "Demo mode",
  "home.placeholderBody":
    "The dashboard, tiles, and add-widget flow land in the next slice.",
  "home.entityCount": "{count} entities streaming",
  "home.disconnect": "Disconnect",

  "settings.langEn": "English",
  "settings.langAm": "አማርኛ",
} as const;

export type MessageKey = keyof typeof en;
