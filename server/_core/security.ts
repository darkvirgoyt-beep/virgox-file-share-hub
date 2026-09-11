import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 60_000;
const MAX_BUCKETS = 10_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function clientAddress(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https:");
  if (_req.secure || _req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = typeof req.headers["x-request-id"] === "string" && /^[A-Za-z0-9._-]{8,80}$/.test(req.headers["x-request-id"])
    ? req.headers["x-request-id"]
    : crypto.randomUUID();
  res.setHeader("X-Request-Id", id);
  res.locals.requestId = id;
  next();
}

export function rateLimit(name: string, limit: number, windowMs = WINDOW_MS) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = consumeRateLimit(name, clientAddress(req), limit, windowMs);
    res.setHeader("X-RateLimit-Remaining", String(result.remaining));
    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfter));
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }
    next();
  };
}

export function consumeRateLimit(name: string, address: string, limit: number, windowMs = WINDOW_MS) {
  const now = Date.now();
  const key = `${name}:${address}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [bucketKey, bucket] of Array.from(buckets.entries())) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
      if (buckets.size >= MAX_BUCKETS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfter: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function logSecurityEvent(event: string, req: Request, details?: Record<string, unknown>) {
  console.warn("[SecurityEvent]", JSON.stringify({
    event,
    requestId: req.res?.locals?.requestId,
    ip: clientAddress(req),
    method: req.method,
    path: req.path,
    ...details,
  }));
}
