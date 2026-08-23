export const en = {
  "app.starting": "Starting Ethio Home…",

  "common.cancel": "Cancel",

  "setup.connectTitle": "Connect your hub",
  "setup.connectDescription":
    "Use a long-lived access token from your profile. Entity data stays on your network.",
  "setup.urlLabel": "Hub URL",
  "setup.urlPlaceholder": "http://192.168.1.1:8123",
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

  "setup.errorRequired": "Hub URL and long-lived access token are required.",
  "setup.errorInvalidUrl": "Enter a valid URL, e.g. http://192.168.1.1:8123",
  "setup.errorUnreachable":
    "Nothing answered at that address. Check the hub is on and on this network.",
  "setup.errorTokenRejected":
    "The server answered, so the address is right. Paste a new long-lived access token from your profile.",
  "setup.errorConnectionLost": "The connection dropped before setup finished.",
  "setup.errorGeneric": "Could not reach the hub.",

  "setup.demoTitle": "Try demo mode",
  "setup.demoDescription":
    "Explore a sample dashboard with simulated lights, switches, and sensors — no hub required.",
  "setup.startDemo": "Start demo",
  "setup.errorDemo": "Failed to start demo mode.",

  "tabs.home": "Home",
  "tabs.assist": "Assist",
  "tabs.activity": "Activity",
  "tabs.settings": "Settings",

  "home.title": "Home",
  "home.demoBadge": "Demo mode",
  "home.entityCount": "{count} entities streaming",
  "home.emptyTitle": "Nothing to show yet",
  "home.emptyBody":
    "No entity here maps to a tile yet. More widget types land in the next slice.",
  "home.edit": "Edit",
  "home.done": "Done",
  "home.addWidget": "Add tile",
  "home.removeWidget": "Remove tile",
  "home.widthFull": "Make tile full width",
  "home.widthHalf": "Make tile half width",

  "picker.title": "Add a tile",
  "picker.description": "Pick an entity. Its type decides the tile.",
  "picker.searchPlaceholder": "Search entities",
  "picker.empty": "Every supported entity is already on the dashboard.",

  "widget.section.favorites": "Favourites",

  "widget.domain.light": "Lights",
  "widget.domain.climate": "Climate",
  "widget.domain.cover": "Covers",
  "widget.domain.lock": "Locks",
  "widget.domain.switch": "Switches",
  "widget.domain.sensor": "Sensors",

  "widget.state.on": "On",
  "widget.state.off": "Off",
  "widget.state.unavailable": "Unavailable",
  "widget.state.locked": "Locked",
  "widget.state.unlocked": "Unlocked",
  "widget.state.locking": "Locking…",
  "widget.state.unlocking": "Unlocking…",
  "widget.state.jammed": "Jammed",
  "widget.state.open": "Open",
  "widget.state.closed": "Closed",
  "widget.state.opening": "Opening…",
  "widget.state.closing": "Closing…",
  "widget.state.detected": "Detected",
  "widget.state.clear": "Clear",

  "widget.action.power": "Toggle power",
  "widget.action.lock": "Lock or unlock",
  "widget.action.cover": "Open or close",

  "widget.brightnessValue": "{percent}% brightness",
  "widget.kelvinValue": "{kelvin}K",
  "widget.hueValue": "{hue}°",

  "widget.light.power": "Power",
  "widget.light.brightness": "Brightness",
  "widget.light.color": "Colour",
  "widget.light.warmth": "Warmth",
  "widget.light.effects": "Effects",

  "widget.climate.currentValue": "Now {value}",
  "widget.climate.warmer": "Warmer",
  "widget.climate.cooler": "Cooler",

  "widget.cover.open": "Open",
  "widget.cover.close": "Close",
  "widget.cover.stop": "Stop",

  "widget.detail.state": "State",
  "widget.detail.entityId": "Entity ID",
  "widget.detail.lastChanged": "Last changed",
  "widget.detail.attributes": "Attributes",

  "widget.sinksar.title": "ስንክሳር",
  "widget.sinksar.story": "Story",
  "widget.sinksar.arke": "አርኬ",
  "widget.sinksar.empty": "No Sinksar entries for today.",
  "widget.sinksar.noStory": "No story for this entry.",

  "widget.team.title": "Team Tracker",
  "widget.team.upcoming": "Upcoming",
  "widget.team.live": "Live",
  "widget.team.final": "Final",
  "widget.team.bye": "Bye week",
  "widget.team.notFound": "No game found",
  "widget.team.vs": "vs",
  "widget.team.lastPlay": "Last play",
  "widget.team.venue": "Venue",
  "widget.team.kickoff": "Kickoff",
  "widget.team.league": "League",
  "widget.team.clock": "Clock",

  "widget.unknownType": "Unsupported widget",
  "widget.entityMissing": "This entity is no longer on the hub.",

  "assist.comingBody":
    "Talk to your home with voice and text. That lands in a later slice.",
  "activity.comingBody":
    "Notifications and history from the hub. That lands in a later slice.",

  "settings.title": "Settings",
  "settings.hub": "Hub",
  "settings.connected": "Connected",
  "settings.disconnect": "Disconnect",
  "settings.disconnectConfirm":
    "This phone will forget the hub and go back to Connect.",

  "settings.dashboard": "Dashboard",
  "settings.resetLayout": "Reset layout",
  "settings.resetLayoutDescription":
    "Tiles you added or removed are discarded and the layout is generated from your areas again.",
  "settings.resetLayoutConfirm": "Reset the dashboard to its generated layout?",

  "settings.langEn": "English",
  "settings.langAm": "አማርኛ",
} as const;

export type MessageKey = keyof typeof en;
