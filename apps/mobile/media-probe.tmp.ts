import {
  connectDemo,
  deriveMedia,
  entityImageUrl,
  fetchAreaIndex,
  withAuthToken,
  type HassEntities,
} from "@ethio/ha-sdk";

import { buildDefaultDashboard } from "@/dashboard/default-dashboard";
import { resolveSections } from "@/dashboard/resolve-sections";

const HOMEPOD = "media_player.homepod";

let passed = 0;
let failed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok ? ` -> ${JSON.stringify(actual)}` : `\n      expected ${JSON.stringify(expected)}\n      actual   ${JSON.stringify(actual)}`),
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const client = connectDemo();
  let entities: HassEntities = {};
  client.subscribeEntities((next) => {
    entities = next;
  });
  await wait(50);

  const index = await fetchAreaIndex(client);
  const document = buildDefaultDashboard(index.areas);
  const sections = resolveSections({
    document,
    entities,
    areas: index.areas,
    areaByEntity: index.areaByEntity,
    t: ((key: string) => key) as never,
  });

  console.log("\n== dashboard placement ==");
  const owning = sections.find((section) =>
    section.widgets.some((w) => w.config.entity_id === HOMEPOD),
  );
  check("HomePod section title", owning?.title, "Living Room");
  const tile = owning?.widgets.find((w) => w.config.entity_id === HOMEPOD);
  check("HomePod widget type", tile?.type, "@ethio/core/media");
  check("HomePod default size", tile?.size, "md");
  check(
    "Living Room still holds its other tiles",
    owning?.widgets.map((w) => w.type),
    [
      "@ethio/core/cover",
      "@ethio/core/climate",
      "@ethio/core/media",
      "@ethio/core/light",
    ],
  );
  check(
    "no section claims the HomePod twice",
    sections.filter((s) => s.widgets.some((w) => w.config.entity_id === HOMEPOD))
      .length,
    1,
  );

  console.log("\n== derived view ==");
  const view = () => deriveMedia(entities[HOMEPOD]);
  check("title", view()?.title, "Morning Light");
  check("artist", view()?.artist, "Addis Ensemble");
  check("isPlaying", view()?.isPlaying, true);
  check("isActive", view()?.isActive, true);
  check("volumePercent", view()?.volumePercent, 45);
  check("isMuted", view()?.isMuted, false);
  check("supportsPrevious", view()?.supportsPrevious, true);
  check("supportsNext", view()?.supportsNext, true);
  check("supportsVolumeSet", view()?.supportsVolumeSet, true);
  check("supportsVolumeMute", view()?.supportsVolumeMute, true);
  check("powerAction while on", view()?.powerAction, "turn_off");

  console.log("\n== controls (the calls the tile makes) ==");
  await client.callService("media_player", "media_play_pause", {
    entity_id: HOMEPOD,
  });
  await wait(30);
  check("play/pause pauses", view()?.isPlaying, false);
  check("paused player is still active", view()?.isActive, true);

  await client.callService("media_player", "media_play_pause", {
    entity_id: HOMEPOD,
  });
  await wait(30);
  check("play/pause resumes", view()?.isPlaying, true);

  await client.callService("media_player", "media_next_track", {
    entity_id: HOMEPOD,
  });
  await wait(30);
  check("next track", view()?.title, "Blue Nile");

  await client.callService("media_player", "media_previous_track", {
    entity_id: HOMEPOD,
  });
  await wait(30);
  check("previous track", view()?.title, "Morning Light");

  await client.callService("media_player", "volume_set", {
    entity_id: HOMEPOD,
    volume_level: 0.8,
  });
  await wait(30);
  check("volume_set 80%", view()?.volumePercent, 80);

  await client.callService("media_player", "volume_mute", {
    entity_id: HOMEPOD,
    is_volume_muted: true,
  });
  await wait(30);
  check("mute", view()?.isMuted, true);

  await client.callService("media_player", "turn_off", { entity_id: HOMEPOD });
  await wait(30);
  check("turn_off", view()?.isOff, true);
  check("off player is not active", view()?.isActive, false);
  check("powerAction while off", view()?.powerAction, "turn_on");

  await client.callService("media_player", "turn_on", { entity_id: HOMEPOD });
  await wait(30);
  check("turn_on", view()?.isOff, false);

  console.log("\n== artwork url ==");
  const hub = "http://homeassistant.local:8123";
  const relative = "/api/media_player_proxy/media_player.homepod?cache=1";
  const hubUrl = entityImageUrl(relative, hub);
  check("relative path resolves against the hub", hubUrl, `${hub}${relative}`);
  check(
    "hub path gets the token",
    withAuthToken(hubUrl, "secret-token"),
    `${hub}${relative}&token=secret-token`,
  );
  const cdn = entityImageUrl("https://i.scdn.co/image/abc", hub);
  check("cdn art is left absolute", cdn, "https://i.scdn.co/image/abc");
  check(
    "cdn art never sees the token",
    cdn?.startsWith(hub) ? "leaked" : "withheld",
    "withheld",
  );
  check(
    "demo art needs no hub",
    entityImageUrl(
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
      "",
    ),
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  client.disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

void main();
