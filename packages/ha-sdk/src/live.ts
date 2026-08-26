import {
  Auth,
  callService as haCallService,
  createConnection,
  createLongLivedTokenAuth,
  ERR_INVALID_AUTH,
  subscribeEntities as haSubscribeEntities,
  type Connection,
  type HassEntities as HaHassEntities,
} from "home-assistant-js-websocket";

import { normalizeBaseUrl } from "./base-url";
import { normalizeHassError } from "./hass-error";
import { HaOAuthError, refreshTokens, type HaTokens } from "./oauth";
import type {
  ConnectionStatus,
  EntityClient,
  HassEntities,
  LiveConnectOptions,
} from "./types";

export interface TokenConnectOptions {
  baseUrl: string;
  tokens: HaTokens;
  onTokens?: (tokens: HaTokens) => void;
}

function toEntities(entities: HaHassEntities): HassEntities {
  return entities as HassEntities;
}

/**
 * Overrides the base class's refresh, which posts `FormData` and reads
 * `location` to sanity-check the scheme. Routing through our own token request
 * keeps one code path for every grant and lets the rotated token be persisted.
 */
class RefreshTokenAuth extends Auth {
  private readonly onTokens?: (tokens: HaTokens) => void;

  constructor(baseUrl: string, tokens: HaTokens, onTokens?: (tokens: HaTokens) => void) {
    super({
      hassUrl: baseUrl,
      clientId: tokens.clientId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires: tokens.expires,
      expires_in: Math.max(
        0,
        Math.round((tokens.expires - Date.now()) / 1000),
      ),
    });
    this.onTokens = onTokens;
  }

  override async refreshAccessToken(): Promise<void> {
    let next: HaTokens;
    try {
      next = await refreshTokens({
        baseUrl: this.data.hassUrl,
        clientId: this.data.clientId ?? "",
        refreshToken: this.data.refresh_token,
      });
    } catch (error) {
      // createSocket compares the thrown value against this exact constant to
      // decide between "log in again" and "retry later".
      if (error instanceof HaOAuthError && error.kind === "invalid-grant") {
        throw ERR_INVALID_AUTH;
      }
      throw error;
    }

    this.data = {
      ...this.data,
      access_token: next.accessToken,
      refresh_token: next.refreshToken,
      expires: next.expires,
      expires_in: Math.max(0, Math.round((next.expires - Date.now()) / 1000)),
    };
    this.onTokens?.(next);
  }
}

export async function connectLive(
  options: LiveConnectOptions,
): Promise<EntityClient> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const auth = createLongLivedTokenAuth(baseUrl, options.token);
  return wrapConnection(await createConnection({ auth }));
}

export async function connectLiveWithTokens(
  options: TokenConnectOptions,
): Promise<EntityClient> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const auth = new RefreshTokenAuth(baseUrl, options.tokens, options.onTokens);
  return wrapConnection(await createConnection({ auth }));
}

function wrapConnection(connection: Connection): EntityClient {
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
    sendBinary(data) {
      const socket = connection.socket;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket is not connected");
      }
      socket.send(data);
    },
    onStatusChange(onChange) {
      const report = (status: ConnectionStatus) => () => {
        onChange(status);
      };
      const onReady = report("connected");
      const onDisconnected = report("reconnecting");
      const onReconnectError = report("error");

      connection.addEventListener("ready", onReady);
      connection.addEventListener("disconnected", onDisconnected);
      connection.addEventListener("reconnect-error", onReconnectError);

      return () => {
        connection.removeEventListener("ready", onReady);
        connection.removeEventListener("disconnected", onDisconnected);
        connection.removeEventListener("reconnect-error", onReconnectError);
      };
    },
    reconnect() {
      connection.reconnect(true);
    },
    async ping() {
      await connection.ping();
    },
    disconnect() {
      connection.close();
    },
  };
}
