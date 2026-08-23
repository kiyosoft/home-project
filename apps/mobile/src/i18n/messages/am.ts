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

  "home.placeholderTitle": "ተገናኙቷል",
  "home.placeholderDemo": "የሙከራ ሁነታ",
  "home.placeholderBody": "ዳሽቦርዱ፣ ታይሎቹ እና ውጅት የመጨመር ሂደት በሚቀጥለው ክፍል ይመጣሉ።",
  "home.entityCount": "{count} ኤንቲቲዎች በቀጥታ እየመጡ ነው",
  "home.disconnect": "አቋርጥ",

  "settings.langEn": "English",
  "settings.langAm": "አማርኛ",
};
