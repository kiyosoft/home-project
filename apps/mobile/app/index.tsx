import { Redirect } from "expo-router";

import { ConnectScreen } from "@/screens/ConnectScreen";
import { useHaStore } from "@/store/ha-store";

export default function Index() {
  const status = useHaStore((state) => state.status);

  if (status === "connected") {
    return <Redirect href="/home" />;
  }

  return <ConnectScreen />;
}
