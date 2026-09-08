import { distanceMeters, isInsideRegion } from "./geo";
import { setWatchAtHome } from "./native";
import { saveAtHome } from "./settings";
import { useWatchStore } from "./watch-store";

export { distanceMeters, isInsideRegion };

export async function noteHomePresence(atHome: boolean): Promise<void> {
  useWatchStore.getState().setAtHome(atHome);
  await saveAtHome(atHome);
  setWatchAtHome(atHome);
}
