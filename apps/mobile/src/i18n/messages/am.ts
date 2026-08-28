import type { MessageKey } from "./en";

export const am: Record<MessageKey, string> = {
  "app.starting": "ኢትዮ ሆም እየጀመረ ነው…",

  "common.cancel": "ተወው",
  "common.back": "ተመለስ",

  "setup.connectTitle": "ከሃቡ ጋር ይገናኙ",
  "setup.connectDescription":
    "በሆም አሲስታንት በኩል ይግቡ። የኤንቲቲ ውሂብ በኔትዎርክዎ ውስጥ ይቆያል።",
  "setup.urlLabel": "የሃብ URL",
  "setup.urlPlaceholder": "http://192.168.1.1:8123",
  "setup.tokenLabel": "የረጅም ጊዜ የመዳረሻ ቶከን",
  "setup.tokenPlaceholder": "ቶከን ይለጥፉ",
  "setup.connect": "ተገናኙ",
  "setup.connecting": "በመገናኘት ላይ…",
  "setup.signIn": "ይግቡ",
  "setup.signingIn": "ሆም አሲስታንት በመክፈት ላይ…",
  "setup.retry": "እንደገና ሞክር",
  "setup.paste": "ለጥፍ",
  "setup.showToken": "ቶከን አሳይ",
  "setup.hideToken": "ቶከን ደብቅ",
  "setup.language": "ቋንቋ",

  "setup.useToken": "በምትኩ የረጅም ጊዜ የመዳረሻ ቶከን ይጠቀሙ",
  "setup.useSignIn": "በምትኩ በሆም አሲስታንት በኩል ይግቡ",

  "setup.discoverTitle": "በዚህ ኔትዎርክ ላይ",
  "setup.discoverEmpty":
    "ምንም አልተገኘም። አድራሻውን በእጅ ያስገቡ፣ ወይም ሃቡ በዚህ ኔትዎርክ ላይ መሆኑን ያረጋግጡ።",
  "setup.discoverRescan": "እንደገና ፈልግ",

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
  "setup.errorNoAddress": "እስካሁን አድራሻ አልተቀመጠም። ለመገናኘት አንድ ያስገቡ።",
  "setup.errorSignedOut": "መግቢያዎ ከአገልግሎት ውጪ ሆኗል። እንደገና ይግቡ።",
  "setup.errorSigninUnavailable":
    "ይህ ሃብ እስካሁን ለመተግበሪያ መግቢያ አልተዘጋጀም። የEt Remote Access አክዖን ጫኑ፣ ከዚያ እንደገና ይሞክሩ።",
  "setup.errorGeneric": "ሃቡ ላይ መድረስ አልተቻለም።",

  "setup.demoTitle": "የሙከራ ሁነታን ይሞክሩ",
  "setup.demoDescription":
    "በናሙና ዳሽቦርድ ላይ የተመሰሉ መብራቶችን፣ ማብሪያ/ማጥፊያዎችን እና ሴንሰሮችን ይመልከቱ — ሃብ አያስፈልግም።",
  "setup.startDemo": "ሙከራ ጀምር",
  "setup.errorDemo": "የሙከራ ሁነታን መጀመር አልተቻለም።",

  "tabs.home": "መነሻ",
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

  "assist.open": "አሲስትን ክፈት",
  "assist.title": "አሲስት",
  "assist.close": "አሲስትን ዝጋ",
  "assist.placeholder": "ስለ ቤቱ ይጠይቁ…",
  "assist.send": "መልእክት ላክ",
  "assist.micStart": "ማዳመጥ ጀምር",
  "assist.micStop": "ማዳመጥ አቁመህ ላክ",
  "assist.listening": "በማዳመጥ ላይ…",
  "assist.wake": "የመቀስቀሻ ቃሉን በማዳመጥ ላይ…",
  "assist.wakeOn": "የመቀስቀሻ ቃል አጥፋ",
  "assist.wakeOff": "የመቀስቀሻ ቃል አብራ",
  "assist.thinking": "በማሰብ ላይ…",
  "assist.empty": "አሲስት ቤቱን እንዲቆጣጠር ወይም ጥያቄ እንዲመልስ ይጠይቁ።",
  "assist.emptyWake": "የመቀስቀሻ ቃሉን ይናገሩ፣ ማይኩን ይንኩ ወይም መልእክት ይጻፉ።",
  "assist.done": "ተከናውኗል።",
  "assist.errorMicDenied":
    "የማይክሮፎን ፈቃድ ጠፍቷል። በቅንብሮች ውስጥ ለኢትዮ ሆም ያብሩት።",
  "assist.errorMicUnavailable": "በዚህ መሣሪያ ላይ ማይክሮፎን የለም።",
  "assist.errorGeneric": "አሲስት ያንን ጥያቄ ማጠናቀቅ አልቻለም።",

  "activity.title": "እንቅስቃሴ",
  "activity.empty": "እስካሁን ምንም የለም።",
  "activity.emptyBody":
    "ቤትዎ የሚልክልዎ ማሳወቂያዎች እዚህ ይታያሉ። ከሆም አሲስታንት የnotify ተግባር ይሞክሩ።",
  "activity.emptyDemo":
    "የማሳያ ሁነታ የሚያሳውቅዎ ሃብ የለውም። እንቅስቃሴ እዚህ ለማየት ከሆም አሲስታንት ጋር ይገናኙ።",
  "activity.hubSection": "ከሆም አሲስታንት",
  "activity.pushSection": "ማሳወቂያዎች",
  "activity.markAllRead": "ሁሉንም እንደተነበበ ምልክት አድርግ",
  "activity.clear": "አጽዳ",
  "activity.dismiss": "አስወግድ",
  "activity.unread": "{count} ያልተነበቡ",
  "activity.new": "አዲስ",
  "activity.justNow": "አሁን",
  "activity.permissionTitle": "ማሳወቂያዎችን አብራ",
  "activity.permissionBody":
    "ቤትዎ ማሳወቂያ ሲልክ ኢትዮ ሆም ባነሮችን ለማሳየት ፈቃድ ያስፈልገዋል።",
  "activity.permissionAllow": "ማሳወቂያዎችን ፍቀድ",
  "activity.permissionDenied":
    "ለኢትዮ ሆም ማሳወቂያዎች ጠፍተዋል። ባነሮችን ለማየት በስልክዎ ቅንብሮች ውስጥ ያብሯቸው።",
  "activity.permissionOpenSettings": "ቅንብሮችን ክፈት",
  "activity.notRegistered":
    "ይህ ስልክ ገና በሆም አሲስታንት አልተመዘገበም፣ ስለዚህ ማሳወቂያ መቀበል አይችልም።",
  "activity.registerFailedNotLoaded":
    "ሆም አሲስታንት የmobile_app ውህደት አልጫነም። default_config ወደ configuration.yaml ጨምረው እንደገና ያስጀምሩ።",
  "activity.registerFailedUnauthorized":
    "ሆም አሲስታንት ይህን ስልክ ለመመዝገብ አልተቀበለም። ውጥተው እንደገና ይግቡ።",
  "activity.registerFailedUnreachable":
    "ይህን ስልክ ለመመዝገብ ሆም አሲስታንት ላይ መድረስ አልተቻለም። በሚቀጥለው ግንኙነት እንደገና ይሞከራል።",
  "activity.registerFailedRejected":
    "ሆም አሲስታንት የዚህን ስልክ የምዝገባ መረጃ ጥሎታል። በሆም አሲስታንት ሎግ ውስጥ ልክ ያልሆነ webhook payload ይፈትሹ።",
  "activity.pushTitle": "መተግበሪያው ተዘግቶ ሲኖር ማሳወቂያዎች",
  "activity.pushStateOn": "በርቷል",
  "activity.pushStateOff": "ጠፍቷል",
  "activity.pushStatePending": "በመዘጋጀት ላይ",
  "activity.pushSynced":
    "ኢትዮ ሆም ተዘግቶ ቢሆንም ሆም አሲስታንት በpush ማስተላለፊያው በኩል ይህን ስልክ ማግኘት ይችላል።",
  "activity.pushSyncing": "ይህ ስልክ ለpush ማሳወቂያዎች በመመዝገብ ላይ…",
  "activity.pushNoRelay":
    "ማሳወቂያዎች የሚደርሱት ኢትዮ ሆም ክፍት ሲሆን ብቻ ነው። መተግበሪያው ተዘግቶ ሲኖርም ለመቀበል በEt Remote Access አክል-ኦን ውስጥ የpush ማስተላለፊያውን ያብሩ።",
  "activity.pushSimulator":
    "ሲሙሌተሮችና ኢሙሌተሮች push ማሳወቂያ መቀበል አይችሉም። በእውነተኛ ስልክ ላይ የልማት ግንባታ ይጠቀሙ።",
  "activity.pushNoProject":
    "ይህ ግንባታ የEAS ፕሮጀክት መለያ የለውም፣ ስለዚህ የpush ቶከን ማግኘት አይችልም። በEAS እንደገና ይገንቡት።",
  "activity.pushFailed":
    "ለዚህ ስልክ የpush ቶከን ከExpo ማግኘት አልተቻለም። እንደገና ይሞከራል።",
  "activity.pushHaRejected":
    "ይህ ስልክ የpush ቶከን አለው፣ ነገር ግን ሆም አሲስታንት አልተቀበለውም። በሚቀጥለው ግንኙነት እንደገና ይሞከራል።",
  "activity.pushNoRegistration":
    "ሆም አሲስታንት ይህን ስልክ ከምዝገባ አጥቶታል፣ እንደገና መመዝገብም አልተሳካም። ለመድገም እንደገና ይገናኙ።",
  "activity.pushTimeout":
    "አፕል ወይም ጉግል ለዚህ ስልክ የpush ቶከን አልላኩም። ብዙውን ጊዜ ይህ ማለት ይህ አውታረ መረብ ኢንተርኔት የለውም፣ ወይም መተግበሪያው ያለ push ማረጋገጫዎች ተገንብቷል ማለት ነው። መተግበሪያውን በከፈቱ ቁጥር እንደገና ይሞክራል።",
  "activity.pushRejected":
    "የpush አገልግሎቱ የዚህን ስልክ ቶከን አልተቀበለም፣ ስለዚህ የመጨረሻው ማሳወቂያ አልደረሰም። አዲስ ቶከን ተልኳል፤ ይህ ከቀጠለ መተግበሪያውን በአዲስ የpush ማረጋገጫዎች እንደገና ይገንቡ።",

  "status.reconnecting": "እንደገና በመገናኘት ላይ…",
  "status.offline": "ከመስመር ውጪ",
  "status.retry": "እንደገና ሞክር",

  "connection.title": "ግንኙነት",
  "connection.description":
    "ለአንድ ቤት ሁለት አድራሻዎች፦ በዋይ-ፋይዎ ላይ የሚሠራው፣ እና በሌላ ቦታ ሁሉ የሚሠራው።",
  "connection.internalUrl": "የቤት ውስጥ አድራሻ",
  "connection.internalUrlHelp":
    "ከታች ካሉት የቤት ኔትዎርኮች በአንዱ ላይ ሲሆኑ ይጠቀማል። አብዛኛውን ጊዜ እንደ http://homeassistant.local:8123 ያለ የአካባቢ አድራሻ ነው።",
  "connection.externalUrl": "የውጪ አድራሻ",
  "connection.externalUrlHelp":
    "ከቤት ውጪ ሲሆኑ ይጠቀማል። የተነልዎ ወይም የይፋዊ ሆስት ስምዎ።",
  "connection.prioritizeInternal": "የቤት ውስጥ አድራሻን ቅድሚያ ስጥ",
  "connection.prioritizeInternalHelp":
    "በማንኛውም ኔትዎርክ ላይ ቢሆኑ የቤት ውስጥ አድራሻውን አስቀድሞ ይሞክራል። የዋይ-ፋይ ስም ሊነበብ በማይችልበት ጊዜ ይጠቅማል።",
  "connection.homeNetworks": "የቤት ዋይ-ፋይ ኔትዎርኮች",
  "connection.homeNetworksHelp":
    "በእነዚህ ኔትዎርኮች ላይ መተግበሪያው የቤት ውስጥ አድራሻውን ይጠቀማል። ለአንድ የተወሰነ አክሰስ ፖይንት፣ ከስሙ ይልቅ BSSID:1a:2b:3c:4d:5e:6f ያክሉ።",
  "connection.networkPlaceholder": "የኔትዎርክ ስም",
  "connection.addNetwork": "ጨምር",
  "connection.addCurrent": "ያለሁበትን ኔትዎርክ ጨምር",
  "connection.removeNetwork": "{name}ን አስወግድ",
  "connection.noNetworks":
    "እስካሁን አንድም የለም፤ ስለዚህ የቤት ውስጥ አድራሻ ቅድሚያ ካልተሰጠው በስተቀር የውጪው ይጠቀማል።",
  "connection.permissionTitle": "የአካባቢ ፈቃድ ያስፈልጋል",
  "connection.permissionBody":
    "iOS እና አንድሮይድ የዋይ-ፋይ ኔትዎርክ ስምን የሚያሳዩት የአካባቢ ፈቃድ ላላቸው መተግበሪያዎች ብቻ ነው። ስለ አካባቢዎ ምንም አይቀመጥም ወይም አይላክም።",
  "connection.grantPermission": "ፍቀድ",
  "connection.activeAddress": "አሁን በአገልግሎት ላይ",
  "connection.reconnect": "እንደገና ተገናኝ",
  "connection.errorInvalidUrl": "ትክክለኛ URL ያስገቡ፣ ወይም ባዶ ይተውት።",

  "settings.title": "ቅንብሮች",
  "settings.hub": "ሃብ",
  "settings.connected": "ተገናኝቷል",
  "settings.connection": "ግንኙነት",
  "settings.connectionDescription": "አድራሻዎች እና የቤት ዋይ-ፋይ ኔትዎርኮች።",
  "settings.disconnect": "አቋርጥ",
  "settings.disconnectConfirm": "ይህ ስልክ ሃቡን ይረሳል እና ወደ መገናኘት ይመለሳል።",

  "settings.dashboard": "ዳሽቦርድ",
  "settings.resetLayout": "አቀማመጥ ዳግም አስጀምር",
  "settings.resetLayoutDescription":
    "የጨመሯቸው ታይሎች ሁሉ ይወገዳሉ፣ ዳሽቦርዱም ባዶ ሆኖ ይጀምራል።",
  "settings.resetLayoutConfirm": "ሁሉም ታይሎች ከዳሽቦርዱ ይወገዱ?",

  "settings.langEn": "English",
  "settings.langAm": "አማርኛ",

  "settings.theme": "ገጽታ",
  "settings.themeLight": "ብርሃን",
  "settings.themeDark": "ገለማ",
  "settings.themeSystem": "ስርዓት",
};
