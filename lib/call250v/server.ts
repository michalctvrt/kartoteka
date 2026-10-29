/**
 * Serverový klient Call250V — POUZE pro API routes (app/api/queue/*).
 *
 * Api-Key = číslo licence Call250V. Nikdy se nesmí dostat do prohlížeče,
 * proto se volá jen odsud a čte z .env.local:
 *
 *   CALL250V_BASE_URL=http://192.168.x.x:port   (adresu dodá Kadlec)
 *   CALL250V_API_KEY=<číslo licence>
 *   CALL250V_DEFAULT_OPERATOR_ID=<ID operátora, když ho pracoviště nepošle>
 *   CALL250V_MOCK=1                               (vynutí simulátor)
 */

import type {
  AddToServiceRequest,
  Call250VConfig,
  PatchQueueItemRequest,
  QueueItem,
} from "./types";
import { Call250VError, describeStatus } from "./errors";
import { mock } from "./mock";

const BASE = process.env.CALL250V_BASE_URL?.replace(/\/+$/, "");
const API_KEY = process.env.CALL250V_API_KEY ?? "";
const DEFAULT_OPERATOR = process.env.CALL250V_DEFAULT_OPERATOR_ID ?? "";

export const isMock = process.env.CALL250V_MOCK === "1" || !BASE;

async function request<T>(
  method: string,
  path: string,
  opts: { operatorId?: string; query?: Record<string, string>; body?: unknown } = {}
): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);

  const headers: Record<string, string> = {
    "Api-Key": API_KEY,
    Accept: "application/json",
  };
  const operator = opts.operatorId || DEFAULT_OPERATOR;
  if (operator) headers["Operator-Id"] = operator;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    throw new Call250VError(
      503,
      `Call250V (${BASE}) nedostupný: ${(e as Error).message}`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Call250VError(
      res.status,
      describeStatus(res.status) + (text ? ` ${text.slice(0, 200)}` : "")
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const call250v = {
  getConfig(): Promise<Call250VConfig> {
    return isMock ? mock.getConfig() : request("GET", "/queue/config");
  },

  list(serviceId?: string): Promise<QueueItem[]> {
    if (isMock) return mock.list(serviceId);
    return request("GET", "/queue/queueItem", {
      query: serviceId ? { serviceId } : {},
    });
  },

  addToService(body: AddToServiceRequest): Promise<QueueItem> {
    if (isMock) return mock.addToService(body);
    return request("POST", "/queue/queueItem/addToService", { body });
  },

  next(counter: string, operatorId?: string, serviceId?: string): Promise<QueueItem> {
    if (isMock) return mock.next(counter, serviceId);
    return request("POST", "/queue/queueItem/next", {
      operatorId,
      query: { counter },
      body: serviceId ? { serviceId } : {},
    });
  },

  call(id: string, counter: string, operatorId?: string): Promise<QueueItem> {
    if (isMock) return mock.call(id, counter);
    return request("POST", `/queue/queueItem/${encodeURIComponent(id)}/call`, {
      operatorId,
      query: { counter },
      body: {},
    });
  },

  patch(id: string, body: PatchQueueItemRequest, operatorId?: string): Promise<void> {
    if (isMock) return mock.patch(id, body);
    return request("PATCH", `/queue/queueItem/${encodeURIComponent(id)}`, {
      operatorId,
      body,
    });
  },

  complete(id: string, operatorId?: string): Promise<void> {
    if (isMock) return mock.complete(id);
    return request("POST", `/queue/queueItem/${encodeURIComponent(id)}/complete`, {
      operatorId,
    });
  },
};
