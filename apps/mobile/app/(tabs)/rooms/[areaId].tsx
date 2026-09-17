import { useLocalSearchParams } from "expo-router";

import { RoomScreen } from "@/screens/RoomScreen";

export default function RoomRoute() {
  const { areaId } = useLocalSearchParams<{ areaId: string }>();
  return (
    <RoomScreen
      areaId={Array.isArray(areaId) ? (areaId[0] ?? "") : (areaId ?? "")}
    />
  );
}
