declare module "react-native-zeroconf" {
  export interface ZeroconfService {
    name: string;
    fullName?: string;
    host?: string;
    port?: number;
    addresses?: string[];
    txt?: Record<string, string | undefined>;
  }

  export const ImplType: { NSD: string; DNSSD: string };

  interface ZeroconfEvents {
    start: () => void;
    stop: () => void;
    found: (name: string) => void;
    remove: (name: string) => void;
    resolved: (service: ZeroconfService) => void;
    update: () => void;
    error: (error: Error) => void;
  }

  export default class Zeroconf {
    constructor(props?: Record<string, unknown>);
    on<K extends keyof ZeroconfEvents>(
      event: K,
      listener: ZeroconfEvents[K],
    ): this;
    removeAllListeners(event?: keyof ZeroconfEvents): this;
    scan(
      type?: string,
      protocol?: string,
      domain?: string,
      implType?: string,
    ): void;
    stop(implType?: string): void;
    getServices(): Record<string, ZeroconfService>;
    addDeviceListeners(): void;
    removeDeviceListeners(): void;
  }
}
