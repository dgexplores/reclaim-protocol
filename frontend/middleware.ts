import { NextRequest, NextResponse } from "next/server";

// In-memory rate store (edge-safe for Vercel; resets per isolate, fine for demo)
// For production scale: replace with Upstash Redis
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Security hardening already via next.config, add request ID
  const reqId = crypto.randomUUID();
  res.headers.set("x-request-id", reqId);
  res.headers.set("x-reclaim-version", "1.0.0");

  // Load balancing hint: Vercel handles edge, we add region affinity
  // All API routes get stricter rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const path = req.nextUrl.pathname;

  if (path.startsWith("/api/")) {
    // Global API: 60/min per IP
    const g = rateLimit(`g:${ip}`, 60, 60_000);
    res.headers.set("x-ratelimit-limit", "60");
    res.headers.set("x-ratelimit-remaining", String(g.remaining));
    res.headers.set("x-ratelimit-reset", String(Math.ceil(g.resetAt / 1000)));
    if (!g.allowed) {
      return new NextResponse(JSON.stringify({ error: "Rate limit exceeded. Try in 60s.", code: "RATE_LIMITED" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          "x-ratelimit-remaining": "0",
          "x-request-id": reqId,
        },
      });
    }
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
