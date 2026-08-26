import { Redirect } from "expo-router";

import { ConnectScreen } from "@/screens/ConnectScreen";
import { hasSession, useHaStore } from "@/store/ha-store";

export default function Index() {
  const status = useHaStore((state) => state.status);

  if (hasSession(status)) {
    return <Redirect href="/home" />;
  }

  return <ConnectScreen />;
}
