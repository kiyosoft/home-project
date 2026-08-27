import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import { Platform } from "react-native";

/**
 * Identity we hand to Home Assistant's `mobile_app` registration. The id has to
 * survive reinstalls of the JS bundle and every reconnect, otherwise HA gathers
 * a new orphaned device each time.
 */

const DEVICE_ID_KEY = "ethio-home.device-id.v1";

export const APP_ID = "app.ethiohome.companion";
export const APP_NAME = "Ethio Home";

export interface DeviceIdentity {
  deviceId: string;
  deviceName: string;
  manufacturer: string;
  model: string;
  osName: string;
  osVersion: string;
  appVersion: string;
}

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  const created = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  cachedDeviceId = created;
  return created;
}

export function appVersion(): string {
  return Constants.expoConfig?.version ?? "0.0.0";
}

/**
 * HA shows `deviceName` in its device list and derives the notify target name
 * from it, so an empty string here would leave the user with
 * `notify.mobile_app_` and no way to tell their phones apart.
 */
export function deviceName(): string {
  return (
    Device.deviceName ??
    Device.modelName ??
    (Platform.OS === "ios" ? "iPhone" : "Android device")
  );
}

export async function readDeviceIdentity(): Promise<DeviceIdentity> {
  return {
    deviceId: await getDeviceId(),
    deviceName: deviceName(),
    manufacturer: Device.manufacturer ?? Device.brand ?? "Unknown",
    model: Device.modelName ?? "Unknown",
    osName: Device.osName ?? (Platform.OS === "ios" ? "iOS" : "Android"),
    osVersion: Device.osVersion ?? String(Platform.Version),
    appVersion: appVersion(),
  };
}
