import {
  callService as haCallService,
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities as haSubscribeEntities,
  type Connection,
  type HassEntities as HaHassEntities,
} from "home-assistant-js-websocket";

import type { EntityClient, HassEntities, LiveConnectOptions } from "./types";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function toEntities(entities: HaHassEntities): HassEntities {
  return entities as HassEntities;
}

export async function connectLive(
  options: LiveConnectOptions,
): Promise<EntityClient> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const auth = createLongLivedTokenAuth(baseUrl, options.token);
  const connection: Connection = await createConnection({ auth });

  return {
    subscribeEntities(onChange) {
      return haSubscribeEntities(connection, (entities) => {
        onChange(toEntities(entities));
      });
    },
    async callService(domain, service, serviceData) {
      await haCallService(connection, domain, service, serviceData);
    },
    disconnect() {
      connection.close();
    },
  };
}
