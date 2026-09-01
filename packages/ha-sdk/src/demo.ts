import type {
  AreaRegistryEntry,
  DeviceRegistryEntry,
  EntityRegistryEntry,
} from "./registry";
import { renderDemoTemplate } from "./template";
import { TODO_FEATURE, type TodoItem } from "./todo";
import type {
  BrowseMediaItem,
  EntityClient,
  HassEntities,
  HassEntity,
} from "./types";

/** TURN_ON|TURN_OFF|PAUSE|SEEK|VOLUME_SET|VOLUME_MUTE|PREVIOUS|NEXT|PLAY_MEDIA|PLAY|BROWSE_MEDIA|SHUFFLE|REPEAT */
const DEMO_MEDIA_FEATURES = 443327;

/** Everything except SET_DUE_DATETIME_ON_ITEM, so the demo list uses plain dates. */
const DEMO_TODO_FEATURES =
  TODO_FEATURE.CREATE_TODO_ITEM |
  TODO_FEATURE.DELETE_TODO_ITEM |
  TODO_FEATURE.UPDATE_TODO_ITEM |
  TODO_FEATURE.MOVE_TODO_ITEM |
  TODO_FEATURE.SET_DUE_DATE_ON_ITEM |
  TODO_FEATURE.SET_DESCRIPTION_ON_ITEM;

const DEMO_TODO_ENTITY_ID = "todo.shopping_list";

/** A real bolt takes a moment to travel, and the UI animates that gap. */
const LOCK_TRAVEL_MS = 400;

const DEMO_TODO_ITEMS: TodoItem[] = [
  {
    uid: "todo-1",
    summary: "Buy teff flour",
    status: "needs_action",
    description: "Two kilos from the Merkato stall",
  },
  { uid: "todo-2", summary: "Refill water filter", status: "needs_action" },
  { uid: "todo-3", summary: "Book car service", status: "needs_action" },
  { uid: "todo-4", summary: "Pay electricity bill", status: "completed" },
];

const DEMO_TRACKS = [
  {
    id: "library/track/1",
    title: "Morning Light",
    artist: "Addis Ensemble",
    album: "Highlands",
    contentType: "music",
    thumbnail:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    duration: 214,
  },
  {
    id: "library/track/2",
    title: "Blue Nile",
    artist: "Lake Tana Quartet",
    album: "River Songs",
    contentType: "music",
    thumbnail:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    duration: 198,
  },
  {
    id: "playlist/evening/1",
    title: "Evening Jazz Mix",
    artist: "Music Assistant",
    album: "Evening",
    contentType: "playlist",
    thumbnail:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop",
    duration: 3600,
  },
] as const;

const DEMO_RADIO_STATIONS = [
  {
    id: "media-source://radio_browser/station-fana",
    title: "Fana Radio",
    artist: "Ethiopia",
    contentType: "audio/mpeg",
    thumbnail:
      "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=400&fit=crop",
  },
  {
    id: "media-source://radio_browser/station-sheger",
    title: "Sheger FM",
    artist: "Ethiopia",
    contentType: "audio/mpeg",
    thumbnail:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
  },
  {
    id: "media-source://radio_browser/station-ebc",
    title: "EBC Radio",
    artist: "Ethiopia",
    contentType: "audio/mpeg",
    thumbnail:
      "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&h=400&fit=crop",
  },
] as const;

const DEMO_ENTITIES: HassEntities = {
  "light.living_room": {
    entity_id: "light.living_room",
    state: "on",
    attributes: {
      friendly_name: "Living Room Light",
      brightness: 180,
      color_mode: "color_temp",
      color_temp_kelvin: 3200,
      min_color_temp_kelvin: 2200,
      max_color_temp_kelvin: 6500,
      rgb_color: [255, 200, 140],
      supported_color_modes: ["brightness", "color_temp", "rgb"],
      effect_list: ["none", "colorloop"],
      effect: "none",
    },
  },
  "camera.front_door": {
    entity_id: "camera.front_door",
    state: "idle",
    attributes: {
      friendly_name: "Front Door Camera",
      brand: "DemoCam",
      model: "DC-100",
      supported_features: 3,
      entity_picture:
        "https://picsum.photos/seed/ethio-front-door/640/360",
      access_token: "demo-camera-token",
    },
  },
  "lock.front_door": {
    entity_id: "lock.front_door",
    state: "locked",
    attributes: {
      friendly_name: "Front Door Lock",
      supported_features: 1,
      changed_by: "Demo User",
    },
  },
  "alarm_control_panel.home": {
    entity_id: "alarm_control_panel.home",
    state: "disarmed",
    attributes: {
      friendly_name: "Home Alarm",
      code_format: "number",
      code_arm_required: false,
      supported_features: 63,
      changed_by: null,
    },
  },
  "calendar.family": {
    entity_id: "calendar.family",
    state: "on",
    attributes: {
      friendly_name: "Family Calendar",
      message: "School pickup",
      all_day: false,
      start_time: "2026-08-11T15:00:00+00:00",
      end_time: "2026-08-11T16:00:00+00:00",
      location: "School gate",
      description: "Pick up the kids",
    },
  },
  "switch.porch": {
    entity_id: "switch.porch",
    state: "off",
    attributes: {
      friendly_name: "Porch Switch",
    },
  },
  "sensor.outdoor_temperature": {
    entity_id: "sensor.outdoor_temperature",
    state: "21.4",
    attributes: {
      friendly_name: "Outdoor Temperature",
      unit_of_measurement: "°C",
      device_class: "temperature",
    },
  },
  "binary_sensor.front_door": {
    entity_id: "binary_sensor.front_door",
    state: "off",
    attributes: {
      friendly_name: "Front Door",
      device_class: "door",
    },
  },
  "binary_sensor.fasting": {
    entity_id: "binary_sensor.fasting",
    state: "on",
    attributes: {
      friendly_name: "Fasting Day",
      device_class: "occupancy",
      icon: "mdi:food-off",
    },
  },
  "input_boolean.guest_mode": {
    entity_id: "input_boolean.guest_mode",
    state: "off",
    attributes: {
      friendly_name: "Guest Mode",
    },
  },
  "sensor.demo_arsenal": {
    entity_id: "sensor.demo_arsenal",
    state: "IN",
    attributes: {
      friendly_name: "Arsenal",
      sport: "soccer",
      league: "English Premier League",
      league_logo: "https://a.espncdn.com/i/teamlogos/leagues/500/eng.1.png",
      team_abbr: "ARS",
      team_name: "Arsenal",
      team_logo: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
      team_score: 2,
      team_rank: 2,
      team_colors: ["#EF0107", "#FFFFFF"],
      opponent_abbr: "CHE",
      opponent_name: "Chelsea",
      opponent_logo: "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
      opponent_score: 1,
      opponent_rank: 5,
      opponent_colors: ["#034694", "#FFFFFF"],
      clock: "67'",
      venue: "Emirates Stadium",
      date: "2026-08-06T15:00:00+00:00",
      kickoff_in: "in progress",
      possession: "359",
      last_play:
        "Saka beats Cucurella on the right and cuts the ball back into the six-yard box.",
      api_message: "",
    },
  },
  "sensor.demo_sinksar": {
    entity_id: "sensor.demo_sinksar",
    state: "ርዕሰ ዓውደ ዓመት",
    attributes: {
      friendly_name: "Sinksar today",
      day_of_year: 1,
      entries: [
        {
          title: "ርዕሰ ዓውደ ዓመት",
          type: "ዘመን መለወጫ",
          order: 1,
          story:
            "የእግዚአብሔርን ረድኤት አጋዥ በማድረግ በበጎ ስጦታውም ይህንንን የስንክሳር መጽሐፍ እንጽፋለን። ስንክሳር ትርጓሜው የተሰበሰበ ማለት ነው።\n\nይኸውም የከበሩ አባቶቻችን የቤተ ክርስቲያን መምህራን የአትሪብና የመሊግ ኤጲስቆጶስ ክቡር አባት አባ ሚካኤልና የሀገረ ቡርልስ የከበረ አባት አባ ዮሐንስ እንዲሁም ሃይማኖታቸው የቀና ሌሎች የከበሩ አባቶች ከቅዱሳን ሰማዕታት ከጻድቃን ከነቢያት ከሐዋርያት ከሊቃነ ጳጳሳት ከኤጲስቆጶሳት ከመነኰሳትም ሁሉ ከገዳማውያንም ከገድሎቻቸው ከመላእክት አለቆችም ከድርሳናቸው የሰበሰቡትና ያቀነባበሩት አምላክን የወለደች እመቤታችን የከበረች ድን…",
          arke: [],
        },
        {
          title: "ጻድቁ ኢዮብ የተፈወሰበት",
          type: "ጻድቅ",
          order: 6,
          story:
            "በዚችም ዕለት ኢዮብ በፈሳሽ ውኃ ታጥቦ ከደዌው ሁሉ ተፈወሰ።\n\nይህም ለሰዎች ልማዳቸው ሁኖ ዓመቱ ዙሮ ሲመጣ ፈሳሹ ውኃም በመላ ጊዜ በአዲስ ውኃ ይጠመቃሉ በእርሱም ይባረካሉ።\n\nየጻድቁ ኢዮብ በረከትም ከእኛ ጋራ ትኑር ለዘላለሙ አሜን።",
          arke: [
            "ሰላም ለኢዮብ ዘኢነበበ ከንቶ። አመ አኀዞ አበቅ ወአመ አህጐለ ጥሪቶ። ሐዋርያ መንፈስ ይቤ እንዘ ያነክር ሕይወቶ። ናስተበዕፆሙ ናሁ በብዙኀ አእኲቶ። ለእለ ተዓገሡ ሰብእ ለኢዮብ ትዕግሥቶ።",
          ],
        },
        {
          title: "እረፍቱ ለበርቶሎሜዎስ ሐዋርያ",
          type: "ሐዋርያ",
          order: 3,
          story:
            "ዳግመኛም በዚች ቀን ከዐሥራ ሁለቱ ሐዋርያት አንዱ ሐዋርያ በርተሎሜዎስ ምስክር ሁኖ አረፈ።\n\nለዚህም ሐዋርያ ሒዶ ያስተምር ዘንድ እልዋህ በሚባል አገር ዕጣው ወጣ። እርሱም ከጴጥሮስ ጋር በአንድነት ሔደ የክብር ባለቤት በሆነ በጌታችን ኢየሱስ ክርስቶስ ስም አስተማሩ ልባቸውንም የሚያስደነግጥ ድንቆች ተአምራትን በፊታቸው ከአደረጉ በኋላ እግዚአብሔርን ወደ ማወቅ መለሷቸው።\n\nከዚህም በኃላ ወደ ከተማው ውስጥ ገብቶ ያስተማር ዘንድ ምክንያት አደረገ። ቅዱስ ጴጥሮስም እንደ ባሪያ ሸጠው። ባለ ጸጋ ለሆነ መኰንንም በወይን አትክልት ውስጥ የሚያገለግል ሆነ ድንቅ ተአምርን በማ…",
          arke: [
            "ሰላም ለበርተሎሜዎስ ዘጠብለልዎ በሠቅ። አመ ወገርዎ ሎቱ ውሰተ ባሕር ዕሙቅ። በቅድመ ጉቡአን ሕዝብ ትእምርተ ዝንቱ ጻድቅ። አስተርአየ ውስተ እዴሁ ዘምስለ ፍሬ ጽፉቅ። እምሐረገ ወይን ብሉይ ዘተመትረ ዐጽቅ።",
          ],
        },
        {
          title: "እረፍቱ ለሊቀ ጳጳሳት ሜልዮስ",
          type: "መነኮስ",
          order: 4,
          story:
            "በዚችም ቀን ዳግመኛ የታላቂቱ አገር የእስክንድርያ ሊቀ ጳጳሳት አባ ሜልዮስ አረፈ እርሱም ለአባታችን ሐዋርያና ወንጌላዊ ለሆነ ማርቆስ ሦስተኛ ነው።\n\nይህም አባት የሮሜ ንጉሥ አስባስያኖስ በነገሠ በዐሥራ አምስት ዓመት ተሾመ ይኸውም የክብር ባለቤት ጌታችን በዐረገ በአርባ ዓመት ነው ክብር ይግባ ውና የክርስቶስን መንጋዎች በበጎ አጠባበቅ ጠበቃቸው በሹመቱም ዐሥራ ሁለት ዓመት ኖረ። እግዚአብሔርንም አገልግሎ በሰላም በፍቅር አንድነት አረፈ።\n\nለእግዚአብሔርም ምስጋና ይሁን እኛንም በጸሎቱ ይማረን ለዘላለሙ አሜን።",
          arke: [
            "ሰላም ለሜልዮስ ሊቀ ጳጳሳት በኀበ እስክንድርያ ሥዩም። እምዕርገተ ክርስቶስ በዐርብዓ አክራም። እኤምኅ ኪያከ በቃለ ሰላም። ለብሔረ መርቄ ከመ ያቈርሮ ዝናም። ሣህለ ትንባሌከ ጸግወኒ ለብእሲ ሕሙም።",
          ],
        },
      ],
      story:
        "የእግዚአብሔርን ረድኤት አጋዥ በማድረግ በበጎ ስጦታውም ይህንንን የስንክሳር መጽሐፍ እንጽፋለን። ስንክሳር ትርጓሜው የተሰበሰበ ማለት ነው።\n\nይኸውም የከበሩ አባቶቻችን የቤተ ክርስቲያን መምህራን የአትሪብና የመሊግ ኤጲስቆጶስ ክቡር አባት አባ ሚካኤልና የሀገረ ቡርልስ የከበረ አባት አባ ዮሐንስ እንዲሁም ሃይማኖታቸው የቀና ሌሎች የከበሩ አባቶች ከቅዱሳን ሰማዕታት ከጻድቃን ከነቢያት ከሐዋርያት ከሊቃነ ጳጳሳት ከኤጲስቆጶሳት ከመነኰሳትም ሁሉ ከገዳማውያንም ከገድሎቻቸው ከመላእክት አለቆችም ከድርሳናቸው የሰበሰቡትና ያቀነባበሩት አምላክን የወለደች እመቤታችን የከበረች ድንግል ማርያም ከአደረገቻቸው ድንቆች ተአምራቶችም የክብር ባለቤት የሆነ የመድኃኒታችን ኢየሱስ ክር…",
      arke: [],
    },
  },
  "climate.living_room": {
    entity_id: "climate.living_room",
    state: "heat",
    attributes: {
      friendly_name: "Living Room Climate",
      current_temperature: 21.5,
      temperature: 22,
      temperature_unit: "°C",
      hvac_modes: ["off", "heat", "cool", "auto"],
      hvac_action: "heating",
    },
  },
  "cover.living_blinds": {
    entity_id: "cover.living_blinds",
    state: "open",
    attributes: {
      friendly_name: "Living Blinds",
      current_position: 80,
      supported_features: 15,
    },
  },
  "person.kidus": {
    entity_id: "person.kidus",
    state: "not_home",
    attributes: {
      friendly_name: "Kidus",
      id: "kidus",
      user_id: "demo-kidus",
      source: "device_tracker.phone",
    },
  },
  "weather.home": {
    entity_id: "weather.home",
    state: "partlycloudy",
    attributes: {
      friendly_name: "Home Weather",
      temperature: 24,
      temperature_unit: "°C",
      humidity: 48,
      wind_speed: 12,
    },
  },
  "media_player.homepod": {
    entity_id: "media_player.homepod",
    state: "playing",
    attributes: {
      friendly_name: "Living Room HomePod",
      app_name: "Music Assistant",
      media_title: DEMO_TRACKS[0].title,
      media_artist: DEMO_TRACKS[0].artist,
      media_album_name: DEMO_TRACKS[0].album,
      media_content_id: DEMO_TRACKS[0].id,
      media_content_type: DEMO_TRACKS[0].contentType,
      media_duration: DEMO_TRACKS[0].duration,
      media_position: 42,
      media_position_updated_at: new Date().toISOString(),
      entity_picture: DEMO_TRACKS[0].thumbnail,
      volume_level: 0.45,
      is_volume_muted: false,
      shuffle: false,
      repeat: "off",
      supported_features: DEMO_MEDIA_FEATURES,
    },
  },
  "todo.shopping_list": {
    entity_id: "todo.shopping_list",
    state: String(
      DEMO_TODO_ITEMS.filter((item) => item.status === "needs_action").length,
    ),
    attributes: {
      friendly_name: "Shopping List",
      supported_features: DEMO_TODO_FEATURES,
    },
  },
  "scene.movie_night": {
    entity_id: "scene.movie_night",
    state: "unknown",
    attributes: {
      friendly_name: "Movie night",
      icon: "mdi:movie-open",
    },
  },
  "scene.good_morning": {
    entity_id: "scene.good_morning",
    state: "unknown",
    attributes: {
      friendly_name: "Good morning",
      icon: "mdi:weather-sunset-up",
    },
  },
  "scene.good_night": {
    entity_id: "scene.good_night",
    state: "unknown",
    attributes: {
      friendly_name: "Good night",
      icon: "mdi:weather-night",
    },
  },
  "scene.away": {
    entity_id: "scene.away",
    state: "unknown",
    attributes: {
      friendly_name: "Away",
      icon: "mdi:home-export-outline",
    },
  },
  "script.guest_welcome": {
    entity_id: "script.guest_welcome",
    state: "off",
    attributes: {
      friendly_name: "Guest welcome",
    },
  },
};

const DEMO_AREAS: AreaRegistryEntry[] = [
  { area_id: "living_room", name: "Living Room", icon: "mdi:sofa", floor_id: "ground" },
  { area_id: "front_door", name: "Front Door", icon: "mdi:door", floor_id: "ground" },
  { area_id: "kitchen", name: "Kitchen", icon: "mdi:silverware-fork-knife", floor_id: "ground" },
  { area_id: "outdoors", name: "Outdoors", icon: "mdi:tree", floor_id: null },
];

/** Entities wired straight to an area, with no device in between. */
const DEMO_ENTITY_AREAS: Record<string, string> = {
  "light.living_room": "living_room",
  "climate.living_room": "living_room",
  "cover.living_blinds": "living_room",
  "media_player.homepod": "living_room",
  "binary_sensor.front_door": "front_door",
  "switch.porch": "outdoors",
  "sensor.outdoor_temperature": "outdoors",
  "todo.shopping_list": "kitchen",
};

/** Devices carrying the area for their entities, so the inheritance path stays exercised. */
const DEMO_DEVICES: DeviceRegistryEntry[] = [
  { id: "demo-device-front-door", area_id: "front_door" },
];

const DEMO_DEVICE_ENTITIES: Record<string, string> = {
  "camera.front_door": "demo-device-front-door",
  "lock.front_door": "demo-device-front-door",
};

function demoEntityRegistry(): EntityRegistryEntry[] {
  return Object.keys(DEMO_ENTITIES).map((entityId) => ({
    entity_id: entityId,
    area_id: DEMO_ENTITY_AREAS[entityId] ?? null,
    device_id: DEMO_DEVICE_ENTITIES[entityId] ?? null,
  }));
}

function demoBrowseRoot(): BrowseMediaItem {
  return {
    title: "Music Assistant",
    media_class: "directory",
    media_content_type: "root",
    media_content_id: "",
    can_play: false,
    can_expand: true,
    children: [
      {
        title: "Playlists",
        media_class: "directory",
        media_content_type: "playlists",
        media_content_id: "playlists",
        can_play: false,
        can_expand: true,
        children: [
          {
            title: "Evening Jazz Mix",
            media_class: "playlist",
            media_content_type: "playlist",
            media_content_id: "playlist/evening/1",
            can_play: true,
            can_expand: false,
            thumbnail: DEMO_TRACKS[2].thumbnail,
          },
        ],
      },
      {
        title: "Library",
        media_class: "directory",
        media_content_type: "library",
        media_content_id: "library",
        can_play: false,
        can_expand: true,
        children: [
          {
            title: "Morning Light",
            media_class: "track",
            media_content_type: "music",
            media_content_id: "library/track/1",
            can_play: true,
            can_expand: false,
            thumbnail: DEMO_TRACKS[0].thumbnail,
          },
          {
            title: "Blue Nile",
            media_class: "track",
            media_content_type: "music",
            media_content_id: "library/track/2",
            can_play: true,
            can_expand: false,
            thumbnail: DEMO_TRACKS[1].thumbnail,
          },
        ],
      },
    ],
  };
}

function demoRadioStationItems(): BrowseMediaItem[] {
  return DEMO_RADIO_STATIONS.map((station) => ({
    title: station.title,
    media_class: "music",
    media_content_type: station.contentType,
    media_content_id: station.id,
    can_play: true,
    can_expand: false,
    thumbnail: station.thumbnail,
  }));
}

function demoRadioBrowserRoot(): BrowseMediaItem {
  return {
    title: "Radio Browser",
    media_class: "directory",
    media_content_type: "music",
    media_content_id: "media-source://radio_browser",
    can_play: false,
    can_expand: true,
    children: [
      {
        title: "Popular",
        media_class: "directory",
        media_content_type: "music",
        media_content_id: "media-source://radio_browser/popular",
        can_play: false,
        can_expand: true,
        children: demoRadioStationItems().slice(0, 1),
      },
      {
        title: "Local stations",
        media_class: "directory",
        media_content_type: "music",
        media_content_id: "media-source://radio_browser/local",
        can_play: false,
        can_expand: true,
        children: demoRadioStationItems().slice(0, 2),
      },
      {
        title: "Ethiopia",
        media_class: "directory",
        media_content_type: "music",
        media_content_id: "media-source://radio_browser/country/ET",
        can_play: false,
        can_expand: true,
        children: demoRadioStationItems(),
      },
    ],
  };
}

function demoMediaSourceRoot(): BrowseMediaItem {
  return {
    title: "Media Sources",
    media_class: "directory",
    media_content_type: "app",
    media_content_id: "",
    can_play: false,
    can_expand: true,
    children: [demoRadioBrowserRoot()],
  };
}

function findBrowseNode(
  root: BrowseMediaItem,
  contentType?: string,
  contentId?: string,
): BrowseMediaItem {
  if (!contentType && !contentId) return root;
  const queue = [root, ...(root.children ?? [])];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) break;
    if (
      (!contentType || node.media_content_type === contentType) &&
      (!contentId || node.media_content_id === contentId)
    ) {
      return node;
    }
    if (node.children?.length) queue.push(...node.children);
  }
  return root;
}

function cloneEntities(entities: HassEntities): HassEntities {
  return structuredClone(entities);
}

function nowIso(): string {
  return new Date().toISOString();
}

const DEMO_SCENE_EFFECTS: Record<
  string,
  Record<string, { state: string; attributes?: Record<string, unknown> }>
> = {
  "scene.movie_night": {
    "light.living_room": {
      state: "on",
      attributes: { brightness: 40, color_mode: "brightness" },
    },
    "cover.living_blinds": {
      state: "closed",
      attributes: { current_position: 0 },
    },
  },
  "scene.good_morning": {
    "light.living_room": {
      state: "on",
      attributes: {
        brightness: 220,
        color_mode: "color_temp",
        color_temp_kelvin: 4500,
      },
    },
    "cover.living_blinds": {
      state: "open",
      attributes: { current_position: 100 },
    },
    "switch.porch": { state: "off" },
  },
  "scene.good_night": {
    "light.living_room": { state: "off" },
    "cover.living_blinds": {
      state: "closed",
      attributes: { current_position: 0 },
    },
    "switch.porch": { state: "off" },
    "media_player.homepod": { state: "off" },
    "lock.front_door": { state: "locked" },
  },
  "scene.away": {
    "light.living_room": { state: "off" },
    "switch.porch": { state: "off" },
    "media_player.homepod": { state: "off" },
    "lock.front_door": { state: "locked" },
    "input_boolean.guest_mode": { state: "off" },
  },
  "script.guest_welcome": {
    "input_boolean.guest_mode": { state: "on" },
    "switch.porch": { state: "on" },
  },
};

const SCRIPT_RUN_MS = 800;

const DEMO_ARSENAL_PLAYS = [
  "Saka beats Cucurella on the right and cuts the ball back into the six-yard box.",
  "Ødegaard threads a pass between the centre-backs — Colwill just gets a toe to it.",
  "Rice wins it in midfield and immediately looks for the runner in behind.",
  "Trossard volleys from the six-yard box. Just over the bar.",
  "Gabriel steps across to cut out a through ball. Arsenal clear their lines.",
  "White overlaps and whips a low cross toward the penalty spot.",
];

const DEMO_CHELSEA_PLAYS = [
  "Palmer curls one toward the far post. Raya palms it behind for a corner.",
  "Jackson holds the ball up and lays it off to Enzo at the edge of the box.",
  "Neto whips a cross in from the left. Saliba heads it away.",
  "Caicedo nicks it off Ødegaard and Chelsea break the other way.",
];

const DEMO_ARSENAL_GOALS = [
  "GOAL Arsenal! Saka finishes low into the far corner.",
  "GOAL Arsenal! Ødegaard slots it past the keeper from 12 yards.",
  "GOAL Arsenal! Trossard taps in at the back post.",
];

const DEMO_CHELSEA_GOALS = [
  "GOAL Chelsea! Palmer curls it into the top corner.",
  "GOAL Chelsea! Jackson stoops to head home from close range.",
];

function pickPlay(plays: string[], exclude?: string): string {
  if (plays.length === 0) return exclude ?? "";
  if (plays.length === 1) return plays[0]!;
  const choices = exclude ? plays.filter((play) => play !== exclude) : plays;
  return choices[Math.floor(Math.random() * choices.length)] ?? plays[0]!;
}

function touch(entity: HassEntity): HassEntity {
  const stamp = nowIso();
  return {
    ...entity,
    last_changed: stamp,
    last_updated: stamp,
  };
}

export function connectDemo(): EntityClient {
  let entities = cloneEntities(DEMO_ENTITIES);
  const listeners = new Set<(entities: HassEntities) => void>();
  let todoItems: TodoItem[] = structuredClone(DEMO_TODO_ITEMS);
  const todoListeners = new Set<(items: TodoItem[]) => void>();
  const templateListeners = new Set<() => void>();
  let todoUidCounter = DEMO_TODO_ITEMS.length;
  let sensorTimer: ReturnType<typeof setInterval> | undefined;
  let doorTimer: ReturnType<typeof setInterval> | undefined;
  let teamScoreTimer: ReturnType<typeof setInterval> | undefined;
  const lockTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const scriptTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let closed = false;

  const emit = () => {
    // Shallow copy the map only. Cloning every entity would give every
    // useEntity a new snapshot and rerender the whole dashboard on one tick.
    const snapshot = { ...entities };
    for (const listener of listeners) {
      listener(snapshot);
    }
    for (const listener of templateListeners) {
      listener();
    }
  };

  const setEntity = (entityId: string, next: HassEntity) => {
    entities = {
      ...entities,
      [entityId]: touch(next),
    };
    emit();
  };

  /** Push items to subscribers and keep the entity state (incomplete count) in sync. */
  const commitTodoItems = (next: TodoItem[]) => {
    todoItems = next;
    const snapshot = structuredClone(todoItems);
    for (const listener of todoListeners) {
      listener(structuredClone(snapshot));
    }
    const current = entities[DEMO_TODO_ENTITY_ID];
    if (!current) return;
    const remaining = todoItems.filter(
      (item) => item.status === "needs_action",
    ).length;
    setEntity(DEMO_TODO_ENTITY_ID, {
      ...current,
      state: String(remaining),
    });
  };

  const findTodoItem = (value: string): TodoItem | undefined =>
    todoItems.find((item) => item.uid === value || item.summary === value);

  const handleTodoService = (
    service: string,
    serviceData: Record<string, unknown>,
  ) => {
    if (service === "add_item") {
      const summary =
        typeof serviceData.item === "string" ? serviceData.item.trim() : "";
      if (!summary) return;
      todoUidCounter += 1;
      const item: TodoItem = {
        uid: `todo-${todoUidCounter}`,
        summary,
        status: "needs_action",
      };
      if (typeof serviceData.due_date === "string" && serviceData.due_date) {
        item.due = serviceData.due_date;
      }
      if (
        typeof serviceData.description === "string" &&
        serviceData.description
      ) {
        item.description = serviceData.description;
      }
      commitTodoItems([...todoItems, item]);
      return;
    }

    if (service === "update_item") {
      const target =
        typeof serviceData.item === "string"
          ? findTodoItem(serviceData.item)
          : undefined;
      if (!target) return;
      commitTodoItems(
        todoItems.map((item) => {
          if (item.uid !== target.uid) return item;
          const next: TodoItem = { ...item };
          if (typeof serviceData.rename === "string" && serviceData.rename) {
            next.summary = serviceData.rename.trim();
          }
          if (
            serviceData.status === "completed" ||
            serviceData.status === "needs_action"
          ) {
            next.status = serviceData.status;
          }
          if ("due_date" in serviceData) {
            const due = serviceData.due_date;
            if (typeof due === "string" && due) next.due = due;
            else delete next.due;
          }
          if ("description" in serviceData) {
            const description = serviceData.description;
            if (typeof description === "string" && description) {
              next.description = description;
            } else {
              delete next.description;
            }
          }
          return next;
        }),
      );
      return;
    }

    if (service === "remove_item") {
      const raw = serviceData.item;
      const values = Array.isArray(raw)
        ? raw.filter((value): value is string => typeof value === "string")
        : typeof raw === "string"
          ? [raw]
          : [];
      const uids = new Set(
        values
          .map((value) => findTodoItem(value)?.uid)
          .filter((uid): uid is string => Boolean(uid)),
      );
      if (uids.size === 0) return;
      commitTodoItems(todoItems.filter((item) => !uids.has(item.uid)));
      return;
    }

    if (service === "remove_completed_items") {
      commitTodoItems(todoItems.filter((item) => item.status !== "completed"));
    }
  };

  sensorTimer = setInterval(() => {
    if (closed) return;
    const current = entities["sensor.outdoor_temperature"];
    if (!current) return;
    const value = Number.parseFloat(current.state);
    const drift = (Math.random() - 0.5) * 0.4;
    const next = (Number.isFinite(value) ? value + drift : 21).toFixed(1);
    setEntity("sensor.outdoor_temperature", {
      ...current,
      state: next,
    });
  }, 4000);

  doorTimer = setInterval(() => {
    if (closed) return;
    const current = entities["binary_sensor.front_door"];
    if (!current) return;
    if (Math.random() > 0.7) {
      setEntity("binary_sensor.front_door", {
        ...current,
        state: current.state === "on" ? "off" : "on",
      });
    }
  }, 8000);

  // Kidus walks in a few seconds after demo starts so Welcome home is visible.
  let personArrivalTimer: ReturnType<typeof setTimeout> | undefined;
  personArrivalTimer = setTimeout(() => {
    if (closed) return;
    const current = entities["person.kidus"];
    if (!current) return;
    setEntity("person.kidus", { ...current, state: "home" });
  }, 5000);

  // Live-feel ticks: clock + last_play often, score less often for celebrations.
  let teamLiveTick = 0;
  teamScoreTimer = setInterval(() => {
    if (closed) return;
    const current = entities["sensor.demo_arsenal"];
    if (!current || current.state !== "IN") return;

    const attrs = current.attributes;
    const teamScore =
      typeof attrs.team_score === "number" ? attrs.team_score : 0;
    const opponentScore =
      typeof attrs.opponent_score === "number" ? attrs.opponent_score : 0;
    const clockRaw = typeof attrs.clock === "string" ? attrs.clock : "67'";
    const minute = Number.parseInt(clockRaw, 10);
    const nextMinute = Number.isFinite(minute)
      ? minute >= 90
        ? 55
        : minute + 1
      : 68;
    const prevPlay =
      typeof attrs.last_play === "string" ? attrs.last_play : undefined;

    teamLiveTick += 1;
    const shouldScore = teamLiveTick % 4 === 0;
    const arsenalOnBall = Math.random() > 0.42;
    let nextTeam = teamScore;
    let nextOpponent = opponentScore;
    let lastPlay = pickPlay(
      arsenalOnBall ? DEMO_ARSENAL_PLAYS : DEMO_CHELSEA_PLAYS,
      prevPlay,
    );

    if (shouldScore) {
      const arsenalScores = Math.random() > 0.35;
      if (arsenalScores) {
        nextTeam = teamScore >= 5 ? 1 : teamScore + 1;
        lastPlay = pickPlay(DEMO_ARSENAL_GOALS, prevPlay);
      } else {
        nextOpponent = opponentScore >= 4 ? 0 : opponentScore + 1;
        lastPlay = pickPlay(DEMO_CHELSEA_GOALS, prevPlay);
      }
    }

    setEntity("sensor.demo_arsenal", {
      ...current,
      state: "IN",
      attributes: {
        ...attrs,
        team_score: nextTeam,
        opponent_score: nextOpponent,
        clock: `${nextMinute}'`,
        last_play: lastPlay,
      },
    });
  }, 5000);

  return {
    subscribeEntities(onChange) {
      listeners.add(onChange);
      onChange({ ...entities });
      return () => {
        listeners.delete(onChange);
      };
    },
    async callService(domain, service, serviceData = {}) {
      if (closed) return;

      const entityId =
        typeof serviceData.entity_id === "string"
          ? serviceData.entity_id
          : undefined;

      if (!entityId) return;

      const current = entities[entityId];
      if (!current) return;

      if (domain === "todo") {
        if (entityId === DEMO_TODO_ENTITY_ID) {
          handleTodoService(service, serviceData);
        }
        return;
      }

      if (
        (domain === "scene" || domain === "script") &&
        service === "turn_on"
      ) {
        const effects = DEMO_SCENE_EFFECTS[entityId];
        if (effects) {
          for (const [targetId, patch] of Object.entries(effects)) {
            const target = entities[targetId];
            if (!target) continue;
            const attributes = {
              ...target.attributes,
              ...patch.attributes,
            };
            if (patch.state === "off" && targetId.startsWith("light.")) {
              delete attributes.brightness;
              delete attributes.rgb_color;
              delete attributes.color_temp_kelvin;
              delete attributes.effect;
            }
            if (patch.state === "off" && targetId.startsWith("media_player.")) {
              attributes.media_title = undefined;
              attributes.media_artist = undefined;
              attributes.media_album_name = undefined;
              attributes.entity_picture = undefined;
              attributes.media_position = 0;
            }
            setEntity(targetId, { ...target, state: patch.state, attributes });
          }
        }

        if (domain === "script") {
          const pending = scriptTimers.get(entityId);
          if (pending) clearTimeout(pending);
          setEntity(entityId, { ...current, state: "on" });
          scriptTimers.set(
            entityId,
            setTimeout(() => {
              scriptTimers.delete(entityId);
              if (closed) return;
              const latest = entities[entityId];
              if (!latest) return;
              setEntity(entityId, { ...latest, state: "off" });
            }, SCRIPT_RUN_MS),
          );
        } else {
          setEntity(entityId, { ...current, state: nowIso() });
        }
        return;
      }

      const isToggleDomain =
        domain === "light" || domain === "switch" || domain === "input_boolean";

      if (
        isToggleDomain &&
        (service === "toggle" ||
          service === "turn_on" ||
          service === "turn_off")
      ) {
        let nextState = current.state;
        if (service === "toggle") {
          nextState = current.state === "on" ? "off" : "on";
        } else if (service === "turn_on") {
          nextState = "on";
        } else {
          nextState = "off";
        }

        const attributes = { ...current.attributes };
        if (domain === "light") {
          if (nextState === "on") {
            if (typeof serviceData.brightness === "number") {
              attributes.brightness = serviceData.brightness;
            } else if (typeof serviceData.brightness_pct === "number") {
              attributes.brightness = Math.round(
                (Number(serviceData.brightness_pct) / 100) * 255,
              );
            } else if (attributes.brightness == null) {
              attributes.brightness = 180;
            }
            if (Array.isArray(serviceData.rgb_color)) {
              attributes.rgb_color = serviceData.rgb_color;
              attributes.color_mode = "rgb";
            }
            if (
              typeof serviceData.color_temp_kelvin === "number" ||
              typeof serviceData.color_temp === "number"
            ) {
              attributes.color_temp_kelvin =
                typeof serviceData.color_temp_kelvin === "number"
                  ? serviceData.color_temp_kelvin
                  : serviceData.color_temp;
              attributes.color_mode = "color_temp";
            }
            if (typeof serviceData.effect === "string") {
              attributes.effect = serviceData.effect;
            }
          }
          if (nextState === "off") {
            delete attributes.brightness;
            delete attributes.rgb_color;
            delete attributes.color_temp_kelvin;
            delete attributes.effect;
          }
        }

        setEntity(entityId, {
          ...current,
          state: nextState,
          attributes,
        });
        return;
      }

      if (domain === "lock") {
        const settled =
          service === "lock"
            ? "locked"
            : service === "unlock" || service === "open"
              ? "unlocked"
              : undefined;
        if (!settled) return;

        const pendingTravel = lockTimers.get(entityId);
        if (pendingTravel) clearTimeout(pendingTravel);

        setEntity(entityId, {
          ...current,
          state: settled === "locked" ? "locking" : "unlocking",
        });

        lockTimers.set(
          entityId,
          setTimeout(() => {
            lockTimers.delete(entityId);
            if (closed) return;
            const latest = entities[entityId];
            if (!latest) return;
            setEntity(entityId, { ...latest, state: settled });
          }, LOCK_TRAVEL_MS),
        );
        return;
      }

      if (domain === "alarm_control_panel") {
        const nextByService: Record<string, string> = {
          alarm_disarm: "disarmed",
          alarm_arm_home: "armed_home",
          alarm_arm_away: "armed_away",
          alarm_arm_night: "armed_night",
          alarm_arm_vacation: "armed_vacation",
          alarm_arm_custom_bypass: "armed_custom_bypass",
          alarm_trigger: "triggered",
        };
        const nextState = nextByService[service];
        if (nextState) {
          setEntity(entityId, { ...current, state: nextState });
        }
        return;
      }

      if (domain === "camera") {
        if (service === "turn_on") {
          setEntity(entityId, { ...current, state: "idle" });
        } else if (service === "turn_off") {
          setEntity(entityId, { ...current, state: "off" });
        }
        return;
      }

      if (domain === "climate" && service === "set_temperature") {
        const temperature =
          typeof serviceData.temperature === "number"
            ? serviceData.temperature
            : Number(serviceData.temperature);
        if (!Number.isFinite(temperature)) return;
        setEntity(entityId, {
          ...current,
          attributes: {
            ...current.attributes,
            temperature,
          },
        });
        return;
      }

      if (domain === "cover") {
        const attributes = { ...current.attributes };
        if (service === "open_cover") {
          attributes.current_position = 100;
          setEntity(entityId, { ...current, state: "open", attributes });
        } else if (service === "close_cover") {
          attributes.current_position = 0;
          setEntity(entityId, { ...current, state: "closed", attributes });
        } else if (service === "stop_cover") {
          setEntity(entityId, { ...current, state: "open", attributes });
        }
        return;
      }

      if (domain === "media_player") {
        const attributes = { ...current.attributes };

        if (service === "turn_on") {
          setEntity(entityId, {
            ...current,
            state: "idle",
            attributes,
          });
          return;
        }
        if (service === "turn_off") {
          setEntity(entityId, {
            ...current,
            state: "off",
            attributes: {
              ...attributes,
              media_title: undefined,
              media_artist: undefined,
              media_album_name: undefined,
              entity_picture: undefined,
              media_position: 0,
            },
          });
          return;
        }
        if (service === "media_play") {
          setEntity(entityId, { ...current, state: "playing", attributes });
          return;
        }
        if (service === "media_pause") {
          setEntity(entityId, { ...current, state: "paused", attributes });
          return;
        }
        if (service === "media_play_pause") {
          const next = current.state === "playing" ? "paused" : "playing";
          setEntity(entityId, { ...current, state: next, attributes });
          return;
        }
        if (
          service === "media_next_track" ||
          service === "media_previous_track"
        ) {
          const currentId =
            typeof attributes.media_content_id === "string"
              ? attributes.media_content_id
              : DEMO_TRACKS[0].id;
          const index = DEMO_TRACKS.findIndex(
            (track) => track.id === currentId,
          );
          const delta = service === "media_next_track" ? 1 : -1;
          const nextIndex =
            index < 0
              ? 0
              : (index + delta + DEMO_TRACKS.length) % DEMO_TRACKS.length;
          const track = DEMO_TRACKS[nextIndex] ?? DEMO_TRACKS[0];
          setEntity(entityId, {
            ...current,
            state: "playing",
            attributes: {
              ...attributes,
              media_title: track.title,
              media_artist: track.artist,
              media_album_name: track.album,
              media_content_id: track.id,
              media_content_type: track.contentType,
              media_duration: track.duration,
              media_position: 0,
              media_position_updated_at: nowIso(),
              entity_picture: track.thumbnail,
            },
          });
          return;
        }
        if (service === "volume_set") {
          const level =
            typeof serviceData.volume_level === "number"
              ? serviceData.volume_level
              : Number(serviceData.volume_level);
          if (!Number.isFinite(level)) return;
          setEntity(entityId, {
            ...current,
            attributes: {
              ...attributes,
              volume_level: Math.min(1, Math.max(0, level)),
            },
          });
          return;
        }
        if (service === "volume_mute") {
          setEntity(entityId, {
            ...current,
            attributes: {
              ...attributes,
              is_volume_muted: Boolean(serviceData.is_volume_muted),
            },
          });
          return;
        }
        if (service === "media_seek") {
          const position =
            typeof serviceData.seek_position === "number"
              ? serviceData.seek_position
              : Number(serviceData.seek_position);
          if (!Number.isFinite(position)) return;
          setEntity(entityId, {
            ...current,
            attributes: {
              ...attributes,
              media_position: Math.max(0, position),
              media_position_updated_at: nowIso(),
            },
          });
          return;
        }
        if (service === "shuffle_set") {
          setEntity(entityId, {
            ...current,
            attributes: {
              ...attributes,
              shuffle: Boolean(serviceData.shuffle),
            },
          });
          return;
        }
        if (service === "repeat_set") {
          setEntity(entityId, {
            ...current,
            attributes: {
              ...attributes,
              repeat: serviceData.repeat ?? "off",
            },
          });
          return;
        }
        if (service === "play_media") {
          const contentId =
            typeof serviceData.media_content_id === "string"
              ? serviceData.media_content_id
              : "";
          const radio = DEMO_RADIO_STATIONS.find((item) => item.id === contentId);
          if (radio) {
            setEntity(entityId, {
              ...current,
              state: "playing",
              attributes: {
                ...attributes,
                media_title: radio.title,
                media_artist: radio.artist,
                media_album_name: "Radio Browser",
                media_content_id: radio.id,
                media_content_type:
                  typeof serviceData.media_content_type === "string"
                    ? serviceData.media_content_type
                    : radio.contentType,
                media_duration: undefined,
                media_position: 0,
                media_position_updated_at: nowIso(),
                entity_picture: radio.thumbnail,
              },
            });
            return;
          }
          const track =
            DEMO_TRACKS.find((item) => item.id === contentId) ?? DEMO_TRACKS[0];
          setEntity(entityId, {
            ...current,
            state: "playing",
            attributes: {
              ...attributes,
              media_title: track.title,
              media_artist: track.artist,
              media_album_name: track.album,
              media_content_id: track.id,
              media_content_type:
                typeof serviceData.media_content_type === "string"
                  ? serviceData.media_content_type
                  : track.contentType,
              media_duration: track.duration,
              media_position: 0,
              media_position_updated_at: nowIso(),
              entity_picture: track.thumbnail,
            },
          });
        }
      }
    },
    async sendMessagePromise<T = unknown>(message: Record<string, unknown>) {
      if (closed) {
        throw new Error("Demo client disconnected");
      }
      if (message.type === "call_service") {
        const domain = typeof message.domain === "string" ? message.domain : "";
        const service =
          typeof message.service === "string" ? message.service : "";
        if (domain === "calendar" && service === "get_events") {
          const target = message.target as { entity_id?: string } | undefined;
          const serviceData = message.service_data as
            | { entity_id?: string }
            | undefined;
          const entityId =
            (typeof target?.entity_id === "string" ? target.entity_id : "") ||
            (typeof serviceData?.entity_id === "string"
              ? serviceData.entity_id
              : "");
          if (!entities[entityId]) {
            throw new Error(`Unknown entity: ${entityId}`);
          }
          return {
            response: {
              [entityId]: { events: demoCalendarEvents() },
            },
          } as T;
        }
      }
      if (message.type === "media_player/browse_media") {
        const entityId =
          typeof message.entity_id === "string" ? message.entity_id : "";
        if (!entities[entityId]) {
          throw new Error(`Unknown entity: ${entityId}`);
        }
        const contentType =
          typeof message.media_content_type === "string"
            ? message.media_content_type
            : undefined;
        const contentId =
          typeof message.media_content_id === "string"
            ? message.media_content_id
            : undefined;
        const root = demoBrowseRoot();
        return findBrowseNode(root, contentType, contentId) as T;
      }
      if (message.type === "media_source/browse_media") {
        const contentId =
          typeof message.media_content_id === "string"
            ? message.media_content_id
            : "";
        if (!contentId) return demoMediaSourceRoot() as T;
        const radioRoot = demoRadioBrowserRoot();
        if (contentId === radioRoot.media_content_id) return radioRoot as T;
        const match = (radioRoot.children ?? []).find(
          (child) => child.media_content_id === contentId,
        );
        if (match) return match as T;
        return radioRoot as T;
      }
      if (message.type === "config/area_registry/list") {
        return structuredClone(DEMO_AREAS) as T;
      }
      if (message.type === "config/entity_registry/list") {
        return demoEntityRegistry() as T;
      }
      if (message.type === "config/device_registry/list") {
        return structuredClone(DEMO_DEVICES) as T;
      }
      if (message.type === "get_config") {
        return {
          country: "ET",
          language: "en",
          time_zone: "Africa/Addis_Ababa",
          latitude: 9.03,
          longitude: 38.74,
        } as T;
      }
      if (message.type === "auth/current_user") {
        return { ...DEMO_CURRENT_USER } as T;
      }
      if (message.type === "todo/item/list") {
        assertDemoTodoEntity(message.entity_id);
        return { items: structuredClone(todoItems) } as T;
      }
      if (message.type === "todo/item/move") {
        assertDemoTodoEntity(message.entity_id);
        const uid = typeof message.uid === "string" ? message.uid : "";
        const previousUid =
          typeof message.previous_uid === "string"
            ? message.previous_uid
            : undefined;
        moveDemoTodoItem(uid, previousUid);
        return undefined as T;
      }
      throw new Error(
        `Demo client does not support message type: ${String(message.type)}`,
      );
    },
    async subscribeMessage<T = unknown>(
      message: Record<string, unknown>,
      onMessage: (result: T) => void,
    ) {
      if (closed) {
        throw new Error("Demo client disconnected");
      }
      if (message.type === "render_template") {
        const template =
          typeof message.template === "string" ? message.template : "";
        const rawVars = message.variables;
        const variables =
          typeof rawVars === "object" && rawVars !== null && !Array.isArray(rawVars)
            ? (rawVars as Record<string, unknown>)
            : undefined;
        const push = () => {
          onMessage({
            result: renderDemoTemplate(template, entities, variables),
            listeners: {},
          } as T);
        };
        templateListeners.add(push);
        push();
        return () => {
          templateListeners.delete(push);
        };
      }
      if (message.type === "calendar/event/subscribe") {
        const entityId =
          typeof message.entity_id === "string" ? message.entity_id : "";
        if (!entities[entityId]) {
          throw new Error(`Unknown entity: ${entityId}`);
        }
        onMessage({ events: demoCalendarEvents() } as T);
        return () => {};
      }
      if (message.type !== "todo/item/subscribe") {
        throw new Error(
          `Demo client does not support subscription type: ${String(message.type)}`,
        );
      }
      assertDemoTodoEntity(message.entity_id);

      const listener = (items: TodoItem[]) => {
        onMessage({ items } as T);
      };
      todoListeners.add(listener);
      listener(structuredClone(todoItems));

      return () => {
        todoListeners.delete(listener);
      };
    },
    sendBinary() {
      throw new Error("Demo client does not support binary messages");
    },
    onStatusChange() {
      return () => {};
    },
    reconnect() {},
    async ping() {},
    disconnect() {
      closed = true;
      listeners.clear();
      todoListeners.clear();
      templateListeners.clear();
      if (sensorTimer) clearInterval(sensorTimer);
      if (doorTimer) clearInterval(doorTimer);
      if (teamScoreTimer) clearInterval(teamScoreTimer);
      if (personArrivalTimer) clearTimeout(personArrivalTimer);
      for (const timer of lockTimers.values()) clearTimeout(timer);
      lockTimers.clear();
      for (const timer of scriptTimers.values()) clearTimeout(timer);
      scriptTimers.clear();
    },
  };

  function demoCalendarEvents() {
    const now = Date.now();
    return [
      {
        summary: "School pickup",
        start: new Date(now).toISOString(),
        end: new Date(now + 60 * 60 * 1000).toISOString(),
        location: "School gate",
        description: "Pick up the kids",
        uid: "demo-event-1",
      },
      {
        summary: "Team dinner",
        start: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        end: new Date(now + 26 * 60 * 60 * 1000).toISOString(),
        location: "Home",
        uid: "demo-event-2",
      },
    ];
  }

  function assertDemoTodoEntity(entityId: unknown): void {
    if (entityId !== DEMO_TODO_ENTITY_ID) {
      throw new Error(`Unknown to-do entity: ${String(entityId)}`);
    }
  }

  function moveDemoTodoItem(uid: string, previousUid?: string): void {
    const index = todoItems.findIndex((item) => item.uid === uid);
    if (index < 0) return;
    const next = [...todoItems];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    const target =
      previousUid == null
        ? 0
        : next.findIndex((item) => item.uid === previousUid) + 1;
    next.splice(Math.max(0, target), 0, moved);
    commitTodoItems(next);
  }
}

export const DEMO_CURRENT_USER = {
  id: "demo-kiosk",
  name: "Kiosk",
} as const;

export const DEMO_ENTITY_IDS = {
  light: "light.living_room",
  switch: "switch.porch",
  sensor: "sensor.outdoor_temperature",
  binarySensor: "binary_sensor.front_door",
  fasting: "binary_sensor.fasting",
  inputBoolean: "input_boolean.guest_mode",
  teamtracker: "sensor.demo_arsenal",
  sinksar: "sensor.demo_sinksar",
  climate: "climate.living_room",
  cover: "cover.living_blinds",
  person: "person.kidus",
  weather: "weather.home",
  media: "media_player.homepod",
  todo: "todo.shopping_list",
  camera: "camera.front_door",
  lock: "lock.front_door",
  alarm: "alarm_control_panel.home",
  calendar: "calendar.family",
  movieNight: "scene.movie_night",
  goodMorning: "scene.good_morning",
  goodNight: "scene.good_night",
  away: "scene.away",
  guestWelcome: "script.guest_welcome",
} as const;
