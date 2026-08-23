import type { MessageKey } from "./en";

export const am: Record<MessageKey, string> = {
  "app.starting": "ኢትዮ ሆም እየጀመረ ነው…",

  "setup.connectTitle": "ከ ሆም አሲስታንት ጋር ይገናኙ",
  "setup.connectDescription":
    "ከ HA መገለጫዎ የረጅም ጊዜ የመዳረሻ ቶከን ይጠቀሙ። የኤንቲቲ ውሂብ በኔትዎርክዎ ውስጥ ይቆያል።",
  "setup.urlLabel": "የ ሆም አሲስታንት URL",
  "setup.urlPlaceholder": "http://homeassistant.local:8123",
  "setup.tokenLabel": "የረጅም ጊዜ የመዳረሻ ቶከን",
  "setup.tokenPlaceholder": "ቶከን ይለጥፉ",
  "setup.connect": "ተገናኙ",
  "setup.connecting": "በመገናኘት ላይ…",
  "setup.retry": "እንደገና ሞክር",
  "setup.paste": "ለጥፍ",
  "setup.showToken": "ቶከን አሳይ",
  "setup.hideToken": "ቶከን ደብቅ",
  "setup.language": "ቋንቋ",

  "setup.addressReachable": "ይደረሳል",
  "setup.addressUnreachable": "አይደረስም",
  "setup.tokenRejected": "ተቀባይነት አላገኘም",

  "setup.errorRequired": "የ ሆም አሲስታንት URL እና የረጅም ጊዜ ቶከን ያስፈልጋሉ።",
  "setup.errorInvalidUrl":
    "ትክክለኛ URL ያስገቡ፣ ለምሳሌ http://homeassistant.local:8123",
  "setup.errorUnreachable":
    "በዚያ አድራሻ ምንም ምላሽ አልሰጠም። ሃቡ መብራቱን እና በዚህ ኔትዎርክ ላይ መሆኑን ያረጋግጡ።",
  "setup.errorTokenRejected":
    "አገልጋዩ ምላሽ ሰጥቷል፣ ስለዚህ አድራሻው ትክክል ነው። ከ HA መገለጫዎ አዲስ የረጅም ጊዜ የመዳረሻ ቶከን ይለጥፉ።",
  "setup.errorConnectionLost": "ማዋቀሩ ከመጠናቀቁ በፊት ግንኙነቱ ተቋርጧል።",
  "setup.errorGeneric": "ሆም አሲስታንት ላይ መድረስ አልተቻለም።",

  "setup.demoTitle": "የሙከራ ሁነታን ይሞክሩ",
  "setup.demoDescription":
    "ሆም አሲስታንት ሳያስፈልግ በናሙና ዳሽቦርድ ላይ የተመሰሉ መብራቶችን፣ ማብሪያ/ማጥፊያዎችን እና ሴንሰሮችን ይመልከቱ።",
  "setup.startDemo": "ሙከራ ጀምር",
  "setup.errorDemo": "የሙከራ ሁነታን መጀመር አልተቻለም።",

  "tabs.home": "መነሻ",
  "tabs.assist": "አሲስት",
  "tabs.activity": "እንቅስቃሴ",
  "tabs.settings": "ቅንብሮች",

  "home.title": "መነሻ",
  "home.demoBadge": "የሙከራ ሁነታ",
  "home.entityCount": "{count} ኤንቲቲዎች በቀጥታ እየመጡ ነው",
  "home.emptyTitle": "እስካሁን የሚታይ ነገር የለም",
  "home.emptyBody":
    "እዚህ ያለ ማንኛውም ኤንቲቲ ገና ከታይል ጋር አልተገናኘም። ተጨማሪ የውጅት ዓይነቶች በሚቀጥለው ክፍል ይመጣሉ።",

  "widget.section.favorites": "ተወዳጆች",

  "widget.domain.light": "መብራቶች",
  "widget.domain.climate": "የአየር ንብረት",
  "widget.domain.cover": "መጋረጃዎች",
  "widget.domain.lock": "ቁልፎች",
  "widget.domain.switch": "ማብሪያዎች",
  "widget.domain.sensor": "ሴንሰሮች",

  "widget.state.on": "በርቷል",
  "widget.state.off": "ጠፍቷል",
  "widget.state.unavailable": "አይገኝም",
  "widget.state.locked": "ተቆልፏል",
  "widget.state.unlocked": "ተከፍቷል",
  "widget.state.locking": "በመቆለፍ ላይ…",
  "widget.state.unlocking": "በመክፈት ላይ…",
  "widget.state.jammed": "ተጣብቋል",
  "widget.state.open": "ክፍት",
  "widget.state.closed": "ዝግ",
  "widget.state.opening": "በመክፈት ላይ…",
  "widget.state.closing": "በመዝጋት ላይ…",
  "widget.state.detected": "ተገኝቷል",
  "widget.state.clear": "ንጹህ",

  "widget.brightnessValue": "{percent}% ብርሃን",
  "widget.kelvinValue": "{kelvin}K",

  "widget.light.power": "ኃይል",
  "widget.light.brightness": "ብርሃን",
  "widget.light.warmth": "ሙቀት",
  "widget.light.effects": "ተጽዕኖዎች",

  "widget.climate.currentValue": "አሁን {value}",
  "widget.climate.warmer": "ሙቀት ጨምር",
  "widget.climate.cooler": "ሙቀት ቀንስ",

  "widget.cover.positionValue": "{label} · {percent}%",
  "widget.cover.open": "ክፈት",
  "widget.cover.close": "ዝጋ",
  "widget.cover.stop": "አቁም",

  "widget.detail.state": "ሁኔታ",
  "widget.detail.entityId": "የኤንቲቲ መለያ",
  "widget.detail.lastChanged": "መጨረሻ የተቀየረበት",
  "widget.detail.attributes": "ባህሪያት",

  "widget.unknownType": "ያልተደገፈ ውጅት",
  "widget.entityMissing": "ይህ ኤንቲቲ ከሃቡ ላይ የለም።",

  "assist.comingBody":
    "በድምጽ እና በጽሑፍ ከ ሆም አሲስታንት ጋር ይነጋገሩ። ያ በኋላ በሚመጣው ክፍል ይጨመራል።",
  "activity.comingBody": "ከሃቡ የሚመጡ ማሳወቂያዎች እና ታሪክ። ያ በኋላ በሚመጣው ክፍል ይጨመራል።",

  "settings.title": "ቅንብሮች",
  "settings.hub": "ሆም አሲስታንት",
  "settings.connected": "ተገናኝቷል",
  "settings.disconnect": "አቋርጥ",
  "settings.disconnectConfirm": "ይህ ስልክ ሃቡን ይረሳል እና ወደ መገናኘት ይመለሳል።",
  "settings.disconnectCancel": "ተወው",

  "settings.langEn": "English",
  "settings.langAm": "አማርኛ",
};
