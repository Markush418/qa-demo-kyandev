import type { MiddlewareHandler } from "hono";

interface Entry {
  count: number;
  resetAt: number;
}

export function rateLimit(maxRequests: number, windowMs: number): MiddlewareHandler {
  const store = new Map<string, Entry>();

  // Purga entradas expiradas para evitar fuga de memoria
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, windowMs);

  return async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown";

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count++;
      if (entry.count > maxRequests) {
        return c.json(
          { error: "Demasiadas solicitudes. Esperá un momento antes de continuar." },
          429
        );
      }
    }

    await next();
  };
}
