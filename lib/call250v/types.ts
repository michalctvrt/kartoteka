/**
 * Typy podle specifikace Call250V REST API v1.5 (Kadlec elektronika).
 * Zdroj: Call250V REST API.yaml (OpenAPI 3.0.4).
 */

export type QueueStatus = "pending" | "called";

/** Pacient (lístek) ve frontě. */
export interface QueueItem {
  queueItemId: string;
  externalIdentifier?: string | null;
  /** YYYY-MM-DDTHH:MM:SS — BEZ časové zóny, lokální čas serveru Call250V. */
  createdDate?: string | null;
  serviceId?: string | null;
  counter?: string | null;
  orderNumber?: string | null;
  name?: string | null;
  note?: string | null;
  priority?: boolean;
  status?: QueueStatus | string | null;
}

export interface Call250VConfig {
  version?: string | null;
  branch?: string | null;
  activities?: { serviceId?: string | null; name?: string | null }[] | null;
  printers?: { printerId?: string | null; name?: string | null }[] | null;
}

export interface AddToServiceRequest {
  serviceId?: string | null;
  printerId?: string | null;
  printTicket?: boolean | null;
  orderNumber?: string | null;
  name?: string | null;
  note?: string | null;
  externalIdentifier?: string | null;
  priority?: boolean | null;
}

/** PATCH — aspoň jedno pole musí být vyplněné. */
export interface PatchQueueItemRequest {
  serviceId?: string | null;
  externalIdentifier?: string | null;
  name?: string | null;
  note?: string | null;
}
