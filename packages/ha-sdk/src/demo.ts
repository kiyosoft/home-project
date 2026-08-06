import type { EntityClient, HassEntities, HassEntity } from "./types";

const DEMO_ENTITIES: HassEntities = {
  "light.living_room": {
    entity_id: "light.living_room",
    state: "on",
    attributes: {
      friendly_name: "Living Room Light",
      brightness: 180,
      supported_color_modes: ["brightness"],
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
      league_logo:
        "https://a.espncdn.com/i/teamlogos/leagues/500/eng.1.png",
      team_abbr: "ARS",
      team_name: "Arsenal",
      team_logo:
        "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
      team_score: 2,
      team_rank: 2,
      team_colors: ["#EF0107", "#FFFFFF"],
      opponent_abbr: "CHE",
      opponent_name: "Chelsea",
      opponent_logo:
        "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
      opponent_score: 1,
      opponent_rank: 5,
      opponent_colors: ["#034694", "#FFFFFF"],
      clock: "67'",
      venue: "Emirates Stadium",
      date: "2026-08-06T15:00:00+00:00",
      kickoff_in: "in progress",
      possession: "359",
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
          story: "የእግዚአብሔርን ረድኤት አጋዥ በማድረግ በበጎ ስጦታውም ይህንንን የስንክሳር መጽሐፍ እንጽፋለን። ስንክሳር ትርጓሜው የተሰበሰበ ማለት ነው።\n\nይኸውም የከበሩ አባቶቻችን የቤተ ክርስቲያን መምህራን የአትሪብና የመሊግ ኤጲስቆጶስ ክቡር አባት አባ ሚካኤልና የሀገረ ቡርልስ የከበረ አባት አባ ዮሐንስ እንዲሁም ሃይማኖታቸው የቀና ሌሎች የከበሩ አባቶች ከቅዱሳን ሰማዕታት ከጻድቃን ከነቢያት ከሐዋርያት ከሊቃነ ጳጳሳት ከኤጲስቆጶሳት ከመነኰሳትም ሁሉ ከገዳማውያንም ከገድሎቻቸው ከመላእክት አለቆችም ከድርሳናቸው የሰበሰቡትና ያቀነባበሩት አምላክን የወለደች እመቤታችን የከበረች ድን…",
          arke: [],
        },
        {
          title: "ጻድቁ ኢዮብ የተፈወሰበት",
          type: "ጻድቅ",
          order: 6,
          story: "በዚችም ዕለት ኢዮብ በፈሳሽ ውኃ ታጥቦ ከደዌው ሁሉ ተፈወሰ።\n\nይህም ለሰዎች ልማዳቸው ሁኖ ዓመቱ ዙሮ ሲመጣ ፈሳሹ ውኃም በመላ ጊዜ በአዲስ ውኃ ይጠመቃሉ በእርሱም ይባረካሉ።\n\nየጻድቁ ኢዮብ በረከትም ከእኛ ጋራ ትኑር ለዘላለሙ አሜን።",
          arke: ["ሰላም ለኢዮብ ዘኢነበበ ከንቶ። አመ አኀዞ አበቅ ወአመ አህጐለ ጥሪቶ። ሐዋርያ መንፈስ ይቤ እንዘ ያነክር ሕይወቶ። ናስተበዕፆሙ ናሁ በብዙኀ አእኲቶ። ለእለ ተዓገሡ ሰብእ ለኢዮብ ትዕግሥቶ።"],
        },
        {
          title: "እረፍቱ ለበርቶሎሜዎስ ሐዋርያ",
          type: "ሐዋርያ",
          order: 3,
          story: "ዳግመኛም በዚች ቀን ከዐሥራ ሁለቱ ሐዋርያት አንዱ ሐዋርያ በርተሎሜዎስ ምስክር ሁኖ አረፈ።\n\nለዚህም ሐዋርያ ሒዶ ያስተምር ዘንድ እልዋህ በሚባል አገር ዕጣው ወጣ። እርሱም ከጴጥሮስ ጋር በአንድነት ሔደ የክብር ባለቤት በሆነ በጌታችን ኢየሱስ ክርስቶስ ስም አስተማሩ ልባቸውንም የሚያስደነግጥ ድንቆች ተአምራትን በፊታቸው ከአደረጉ በኋላ እግዚአብሔርን ወደ ማወቅ መለሷቸው።\n\nከዚህም በኃላ ወደ ከተማው ውስጥ ገብቶ ያስተማር ዘንድ ምክንያት አደረገ። ቅዱስ ጴጥሮስም እንደ ባሪያ ሸጠው። ባለ ጸጋ ለሆነ መኰንንም በወይን አትክልት ውስጥ የሚያገለግል ሆነ ድንቅ ተአምርን በማ…",
          arke: ["ሰላም ለበርተሎሜዎስ ዘጠብለልዎ በሠቅ። አመ ወገርዎ ሎቱ ውሰተ ባሕር ዕሙቅ። በቅድመ ጉቡአን ሕዝብ ትእምርተ ዝንቱ ጻድቅ። አስተርአየ ውስተ እዴሁ ዘምስለ ፍሬ ጽፉቅ። እምሐረገ ወይን ብሉይ ዘተመትረ ዐጽቅ።"],
        },
        {
          title: "እረፍቱ ለሊቀ ጳጳሳት ሜልዮስ",
          type: "መነኮስ",
          order: 4,
          story: "በዚችም ቀን ዳግመኛ የታላቂቱ አገር የእስክንድርያ ሊቀ ጳጳሳት አባ ሜልዮስ አረፈ እርሱም ለአባታችን ሐዋርያና ወንጌላዊ ለሆነ ማርቆስ ሦስተኛ ነው።\n\nይህም አባት የሮሜ ንጉሥ አስባስያኖስ በነገሠ በዐሥራ አምስት ዓመት ተሾመ ይኸውም የክብር ባለቤት ጌታችን በዐረገ በአርባ ዓመት ነው ክብር ይግባ ውና የክርስቶስን መንጋዎች በበጎ አጠባበቅ ጠበቃቸው በሹመቱም ዐሥራ ሁለት ዓመት ኖረ። እግዚአብሔርንም አገልግሎ በሰላም በፍቅር አንድነት አረፈ።\n\nለእግዚአብሔርም ምስጋና ይሁን እኛንም በጸሎቱ ይማረን ለዘላለሙ አሜን።",
          arke: ["ሰላም ለሜልዮስ ሊቀ ጳጳሳት በኀበ እስክንድርያ ሥዩም። እምዕርገተ ክርስቶስ በዐርብዓ አክራም። እኤምኅ ኪያከ በቃለ ሰላም። ለብሔረ መርቄ ከመ ያቈርሮ ዝናም። ሣህለ ትንባሌከ ጸግወኒ ለብእሲ ሕሙም።"],
        }
      ],
      story: "የእግዚአብሔርን ረድኤት አጋዥ በማድረግ በበጎ ስጦታውም ይህንንን የስንክሳር መጽሐፍ እንጽፋለን። ስንክሳር ትርጓሜው የተሰበሰበ ማለት ነው።\n\nይኸውም የከበሩ አባቶቻችን የቤተ ክርስቲያን መምህራን የአትሪብና የመሊግ ኤጲስቆጶስ ክቡር አባት አባ ሚካኤልና የሀገረ ቡርልስ የከበረ አባት አባ ዮሐንስ እንዲሁም ሃይማኖታቸው የቀና ሌሎች የከበሩ አባቶች ከቅዱሳን ሰማዕታት ከጻድቃን ከነቢያት ከሐዋርያት ከሊቃነ ጳጳሳት ከኤጲስቆጶሳት ከመነኰሳትም ሁሉ ከገዳማውያንም ከገድሎቻቸው ከመላእክት አለቆችም ከድርሳናቸው የሰበሰቡትና ያቀነባበሩት አምላክን የወለደች እመቤታችን የከበረች ድንግል ማርያም ከአደረገቻቸው ድንቆች ተአምራቶችም የክብር ባለቤት የሆነ የመድኃኒታችን ኢየሱስ ክር…",
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
    state: "home",
    attributes: {
      friendly_name: "Kidus",
      id: "kidus",
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
};

function cloneEntities(entities: HassEntities): HassEntities {
  return structuredClone(entities);
}

function nowIso(): string {
  return new Date().toISOString();
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
  let sensorTimer: ReturnType<typeof setInterval> | undefined;
  let doorTimer: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const emit = () => {
    const snapshot = cloneEntities(entities);
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const setEntity = (entityId: string, next: HassEntity) => {
    entities = {
      ...entities,
      [entityId]: touch(next),
    };
    emit();
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

  return {
    subscribeEntities(onChange) {
      listeners.add(onChange);
      onChange(cloneEntities(entities));
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

      const isToggleDomain =
        domain === "light" ||
        domain === "switch" ||
        domain === "input_boolean";

      if (isToggleDomain && (service === "toggle" || service === "turn_on" || service === "turn_off")) {
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
          if (nextState === "on" && attributes.brightness == null) {
            attributes.brightness = 180;
          }
          if (nextState === "off") {
            delete attributes.brightness;
          }
        }

        setEntity(entityId, {
          ...current,
          state: nextState,
          attributes,
        });
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
      }
    },
    disconnect() {
      closed = true;
      listeners.clear();
      if (sensorTimer) clearInterval(sensorTimer);
      if (doorTimer) clearInterval(doorTimer);
    },
  };
}

export const DEMO_ENTITY_IDS = {
  light: "light.living_room",
  switch: "switch.porch",
  sensor: "sensor.outdoor_temperature",
  binarySensor: "binary_sensor.front_door",
  inputBoolean: "input_boolean.guest_mode",
  teamtracker: "sensor.demo_arsenal",
  sinksar: "sensor.demo_sinksar",
  climate: "climate.living_room",
  cover: "cover.living_blinds",
  person: "person.kidus",
  weather: "weather.home",
} as const;
