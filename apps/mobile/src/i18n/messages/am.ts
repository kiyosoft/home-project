import type { MessageKey } from "./en";

export const am: Record<MessageKey, string> = {
  "app.starting": "ኢትዮ ሆም እየጀመረ ነው…",

  "common.cancel": "ተወው",

  "setup.connectTitle": "ከሃቡ ጋር ይገናኙ",
  "setup.connectDescription":
    "ከመገለጫዎ የረጅም ጊዜ የመዳረሻ ቶከን ይጠቀሙ። የኤንቲቲ ውሂብ በኔትዎርክዎ ውስጥ ይቆያል።",
  "setup.urlLabel": "የሃብ URL",
  "setup.urlPlaceholder": "http://192.168.1.1:8123",
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

  "setup.errorRequired": "የሃብ URL እና የረጅም ጊዜ ቶከን ያስፈልጋሉ።",
  "setup.errorInvalidUrl": "ትክክለኛ URL ያስገቡ፣ ለምሳሌ http://192.168.1.1:8123",
  "setup.errorUnreachable":
    "በዚያ አድራሻ ምንም ምላሽ አልሰጠም። ሃቡ መብራቱን እና በዚህ ኔትዎርክ ላይ መሆኑን ያረጋግጡ።",
  "setup.errorTokenRejected":
    "አገልጋዩ ምላሽ ሰጥቷል፣ ስለዚህ አድራሻው ትክክል ነው። ከመገለጫዎ አዲስ የረጅም ጊዜ የመዳረሻ ቶከን ይለጥፉ።",
  "setup.errorConnectionLost": "ማዋቀሩ ከመጠናቀቁ በፊት ግንኙነቱ ተቋርጧል።",
  "setup.errorGeneric": "ሃቡ ላይ መድረስ አልተቻለም።",

  "setup.demoTitle": "የሙከራ ሁነታን ይሞክሩ",
  "setup.demoDescription":
    "በናሙና ዳሽቦርድ ላይ የተመሰሉ መብራቶችን፣ ማብሪያ/ማጥፊያዎችን እና ሴንሰሮችን ይመልከቱ — ሃብ አያስፈልግም።",
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
  "home.emptyBody": "በዚህ ገጽ ላይ የሚታዩትን ኤንቲቲዎች ይጨምሩ።",
  "home.edit": "አርትዕ",
  "home.done": "ጨርሷል",
  "home.addWidget": "ታይል አክል",
  "home.removeWidget": "ታይል አስወግድ",
  "home.widthFull": "ታይሉን ሙሉ ስፋት አድርግ",
  "home.widthHalf": "ታይሉን ግማሽ ስፋት አድርግ",

  "picker.title": "ታይል አክል",
  "picker.description": "ኤንቲቲ ይምረጡ። ዓይነቱ ታይሉን ይወስናል።",
  "picker.searchPlaceholder": "ኤንቲቲዎችን ይፈልጉ",
  "picker.empty": "የሚደገፉ ኤንቲቲዎች ሁሉ በዳሽቦርዱ ላይ ናቸው።",

  "widget.section.favorites": "ተወዳጆች",

  "widget.domain.light": "መብራቶች",
  "widget.domain.climate": "የአየር ንብረት",
  "widget.domain.cover": "መጋረጃዎች",
  "widget.domain.lock": "ቁልፎች",
  "widget.domain.camera": "ካሜራዎች",
  "widget.domain.switch": "ማብሪያዎች",
  "widget.domain.media": "ሚዲያ",
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
  "widget.state.playing": "እየተጫወተ ነው",
  "widget.state.paused": "ቆሟል",
  "widget.state.idle": "ዝግጁ",
  "widget.state.streaming": "በቀጥታ",
  "widget.state.recording": "በመቅዳት ላይ",

  "widget.action.power": "ኃይል ቀያይር",
  "widget.action.lock": "ቁልፍ ቆልፍ ወይም ክፈት",
  "widget.action.cover": "ክፈት ወይም ዝጋ",

  "widget.brightnessValue": "{percent}% ብርሃን",
  "widget.kelvinValue": "{kelvin}K",
  "widget.hueValue": "{hue}°",
  "widget.volumeValue": "{percent}%",

  "widget.light.power": "ኃይል",
  "widget.light.brightness": "ብርሃን",
  "widget.light.color": "ቀለም",
  "widget.light.warmth": "ሙቀት",
  "widget.light.effects": "ተጽዕኖዎች",

  "widget.climate.currentValue": "አሁን {value}",
  "widget.climate.warmer": "ሙቀት ጨምር",
  "widget.climate.cooler": "ሙቀት ቀንስ",

  "widget.cover.open": "ክፈት",
  "widget.cover.close": "ዝጋ",
  "widget.cover.stop": "አቁም",

  "widget.media.nothingPlaying": "ምንም አይጫወትም",
  "widget.media.playPause": "አጫውት ወይም አቁም",
  "widget.media.previous": "ቀዳሚ ትራክ",
  "widget.media.next": "ቀጣይ ትራክ",
  "widget.media.volume": "ድምጽ",
  "widget.media.mute": "ድምጽ ዝጋ",
  "widget.media.power": "ኃይል",

  "widget.camera.refresh": "ምስል አድስ",
  "widget.camera.live": "ቀጥታ",
  "widget.camera.still": "ምስል አሳይ",
  "widget.camera.power": "ኃይል",
  "widget.camera.liveFailed": "ቀጥታ ስርጭቱን ማስጀመር አልተቻለም።",

  "widget.detail.state": "ሁኔታ",
  "widget.detail.entityId": "የኤንቲቲ መለያ",
  "widget.detail.lastChanged": "መጨረሻ የተቀየረበት",
  "widget.detail.attributes": "ባህሪያት",

  "widget.sinksar.title": "ስንክሳር",
  "widget.sinksar.story": "ታሪክ",
  "widget.sinksar.arke": "አርኬ",
  "widget.sinksar.empty": "ለዛሬ ስንክሳር የለም።",
  "widget.sinksar.noStory": "ለዚህ ገጽ ታሪክ የለም።",

  "widget.team.title": "የቡድን መከታተያ",
  "widget.team.upcoming": "በቅርብ",
  "widget.team.live": "በቀጥታ",
  "widget.team.final": "ተጠናቋል",
  "widget.team.bye": "እረፍት ሳምንት",
  "widget.team.notFound": "ጨዋታ አልተገኘም",
  "widget.team.vs": "ከ",
  "widget.team.lastPlay": "የመጨረሻ እንቅስቃሴ",
  "widget.team.venue": "ሜዳ",
  "widget.team.kickoff": "መጀመሪያ",
  "widget.team.league": "ሊግ",
  "widget.team.clock": "ሰዓት",

  "widget.unknownType": "ያልተደገፈ ውጅት",
  "widget.entityMissing": "ይህ ኤንቲቲ ከሃቡ ላይ የለም።",

  "assist.comingBody":
    "በድምጽ እና በጽሑፍ ከቤትዎ ጋር ይነጋገሩ። ያ በኋላ በሚመጣው ክፍል ይጨመራል።",
  "activity.comingBody": "ከሃቡ የሚመጡ ማሳወቂያዎች እና ታሪክ። ያ በኋላ በሚመጣው ክፍል ይጨመራል።",

  "settings.title": "ቅንብሮች",
  "settings.hub": "ሃብ",
  "settings.connected": "ተገናኝቷል",
  "settings.disconnect": "አቋርጥ",
  "settings.disconnectConfirm": "ይህ ስልክ ሃቡን ይረሳል እና ወደ መገናኘት ይመለሳል።",

  "settings.dashboard": "ዳሽቦርድ",
  "settings.resetLayout": "አቀማመጥ ዳግም አስጀምር",
  "settings.resetLayoutDescription":
    "የጨመሯቸው ታይሎች ሁሉ ይወገዳሉ፣ ዳሽቦርዱም ባዶ ሆኖ ይጀምራል።",
  "settings.resetLayoutConfirm": "ሁሉም ታይሎች ከዳሽቦርዱ ይወገዱ?",

  "settings.langEn": "English",
  "settings.langAm": "አማርኛ",
};
