import { Redirect } from "expo-router";

import { ConnectScreen } from "@/screens/ConnectScreen";
import { useHaStore } from "@/store/ha-store";

export default function Index() {
  const session = useHaStore((state) => state.session);

  // Deliberately not the socket status: an unreachable hub is the dashboard's
  // problem to report, not a reason to ask for credentials again.
  if (session === "active") {
    return <Redirect href="/home" />;
  }

  return <ConnectScreen />;
}
