import type {
  Counter,
  Customer,
  CustomerRequest,
  Note,
  NoteRequest,
  NotificationItem,
  NotificationRequest,
  Order,
  OrderRequest,
  OrderStatus,
  Product,
  ProductRequest,
  RedisInfo,
} from './types';

export const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

/**
 * The notification service is a separate Spring Boot app, so it is not mounted
 * under /api/v1. nginx proxies /api/notification in the container image and the
 * Vite dev server proxies the same prefix.
 */
export const NOTIFICATION_BASE = import.meta.env.VITE_NOTIFICATION_BASE || '/api/notification';

/** SSE endpoint consumed by EventSource; it must not be buffered by a proxy. */
export const NOTIFICATION_STREAM_URL = `${NOTIFICATION_BASE}/stream`;

export class ApiError extends Error {
  status: number;
  details?: Record<string, string>;

  constructor(message: string, status: number, details?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit, base = API_BASE): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('Cannot reach the API. Is the Spring Boot app running?', 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? safeParse(text) : null;

  if (!response.ok) {
    const details =
      body && typeof body === 'object' && body.details && typeof body.details === 'object'
        ? (body.details as Record<string, string>)
        : undefined;
    throw new ApiError(body?.message ?? `Request failed (${response.status})`, response.status, details);
  }

  return body as T;
}

function safeParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

export const productsApi = {
  list: () => request<Product[]>('/products'),
  get: (id: number) => request<Product>(`/products/${id}`),
  search: (name: string) => request<Product[]>(`/products/search?name=${encodeURIComponent(name)}`),
  create: (body: ProductRequest) =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: ProductRequest) =>
    request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/products/${id}`, { method: 'DELETE' }),
};

export const customersApi = {
  list: () => request<Customer[]>('/customers'),
  get: (id: number) => request<Customer>(`/customers/${id}`),
  create: (body: CustomerRequest) =>
    request<Customer>('/customers', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: CustomerRequest) =>
    request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/customers/${id}`, { method: 'DELETE' }),
};

export const ordersApi = {
  list: (customerId?: number) =>
    request<Order[]>(customerId ? `/orders?customerId=${customerId}` : '/orders'),
  create: (body: OrderRequest) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: OrderRequest) =>
    request<Order>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateStatus: (id: number, status: OrderStatus) =>
    request<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  remove: (id: number) => request<void>(`/orders/${id}`, { method: 'DELETE' }),
};

export const notesApi = {
  list: () => request<Note[]>('/notes'),
  create: (body: NoteRequest) =>
    request<Note>('/notes', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: NoteRequest) =>
    request<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) => request<void>(`/notes/${id}`, { method: 'DELETE' }),
};

export const redisApi = {
  info: () => request<RedisInfo>('/redis/info'),
  keys: (pattern = 'demo:*') =>
    request<string[]>(`/redis/cache/keys?pattern=${encodeURIComponent(pattern)}`),
  clearProductCache: () =>
    request<{ pattern: string; deletedKeys: number }>('/redis/cache', { method: 'DELETE' }),
  getCounter: (name: string) => request<Counter>(`/redis/counters/${encodeURIComponent(name)}`),
  incrementCounter: (name: string, by = 1) =>
    request<Counter>(`/redis/counters/${encodeURIComponent(name)}/increment?by=${by}`, {
      method: 'POST',
    }),
  deleteCounter: (name: string) =>
    request<{ name: string; deleted: boolean }>(`/redis/counters/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
};

export const notificationsApi = {
  /** Newest first; SSE payloads use the same shape. */
  list: () => request<NotificationItem[]>('/', undefined, NOTIFICATION_BASE),
  create: (body: NotificationRequest) =>
    request<NotificationItem>(
      '/',
      { method: 'POST', body: JSON.stringify(body) },
      NOTIFICATION_BASE,
    ),
  /** Returns 204; a missing id comes back as 400 with a message. */
  remove: (id: number) =>
    request<void>(`/${id}`, { method: 'DELETE' }, NOTIFICATION_BASE),
};
