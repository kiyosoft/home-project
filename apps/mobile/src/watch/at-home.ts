import { distanceMeters, isInsideRegion } from "./geo";
import { setWatchAtHome } from "./native";
import { useWatchStore } from "./watch-store";

export { distanceMeters, isInsideRegion };

export async function noteHomePresence(atHome: boolean): Promise<void> {
  useWatchStore.getState().setAtHome(atHome);
  setWatchAtHome(atHome);
}
