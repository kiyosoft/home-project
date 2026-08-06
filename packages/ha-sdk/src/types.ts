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

export interface EntityClient {
  subscribeEntities(onChange: (entities: HassEntities) => void): () => void;
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ): Promise<void>;
  disconnect(): void;
}

export interface LiveConnectOptions {
  baseUrl: string;
  token: string;
}
