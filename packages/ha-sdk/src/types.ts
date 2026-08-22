export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
  context?: { id: string; user_id: string | null; parent_id: string | null };
}

export type HassEntities = Record<string, HassEntity>;

export interface BrowseMediaItem {
  title: string;
  media_class?: string;
  media_content_type: string;
  media_content_id: string;
  children_media_class?: string | null;
  can_play: boolean;
  can_expand: boolean;
  thumbnail?: string | null;
  children?: BrowseMediaItem[] | null;
}

export interface EntityClient {
  subscribeEntities(onChange: (entities: HassEntities) => void): () => void;
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ): Promise<void>;
  sendMessagePromise<T = unknown>(
    message: Record<string, unknown>,
  ): Promise<T>;
  subscribeMessage<T = unknown>(
    message: Record<string, unknown>,
    onMessage: (result: T) => void,
  ): Promise<() => void>;
  sendBinary(data: ArrayBuffer | Uint8Array): void;
  disconnect(): void;
}

export interface LiveConnectOptions {
  baseUrl: string;
  token: string;
}
