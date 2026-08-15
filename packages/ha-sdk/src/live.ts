import {
  callService as haCallService,
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities as haSubscribeEntities,
  type Connection,
  type HassEntities as HaHassEntities,
} from "home-assistant-js-websocket";

import { normalizeHassError } from "./hass-error";
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
    sendMessagePromise<T = unknown>(message: Record<string, unknown>) {
      if (typeof message.type !== "string" || !message.type) {
        return Promise.reject(new Error("WebSocket message requires a type"));
      }
      return connection
        .sendMessagePromise<T>(
          message as { type: string } & Record<string, unknown>,
        )
        .catch((error: unknown) => {
          throw normalizeHassError(error);
        });
    },
    async subscribeMessage<T = unknown>(
      message: Record<string, unknown>,
      onMessage: (result: T) => void,
    ) {
      if (typeof message.type !== "string" || !message.type) {
        throw new Error("WebSocket message requires a type");
      }
      const unsubscribe = await connection.subscribeMessage<T>(
        onMessage,
        message as { type: string } & Record<string, unknown>,
      );
      return () => {
        void unsubscribe();
      };
    },
    disconnect() {
      connection.close();
    },
  };
}
