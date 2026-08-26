import NetInfo from "@react-native-community/netinfo";

// `configure` recreates the internal state manager and drops listeners
// registered before it. Import NetInfo only through this module.
NetInfo.configure({ shouldFetchWiFiSSID: true });

export default NetInfo;
