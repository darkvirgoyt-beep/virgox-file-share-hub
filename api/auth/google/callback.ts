import { parse as parseCookieHeader } from "cookie";
import { SignJWT } from "jose";
import { consumeRateLimit } from "../../../server/_core/security.js";

const COOKIE_NAME = "app_session_id";
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

async function createSessionToken(openId: string, name: string): Promise<string> {
  const secret = process.env.JWT_SECRET ?? "";
  const appId = process.env.VITE_APP_ID ?? "";
  if (!secret) throw new Error("Session signing is not configured");
  const expiresAt = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ openId, appId, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(secret));
}

function getCookieOptions() {
  return `Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}`;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  const address = req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const rate = consumeRateLimit("oauth-callback", address, 20, 60_000);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfter));
    res.status(429).json({ error: "Too many login attempts. Please try again later." });
    return;
  }
  const code = typeof req.query?.code === "string" ? req.query.code : undefined;
  const state = typeof req.query?.state === "string" ? req.query.state : undefined;
  const cookies = parseCookieHeader(req.headers?.cookie ?? "");

  if (!code || !state || state !== cookies.google_oauth_state) {
    res.status(403).json({ error: "Invalid Google OAuth state" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) {
    res.status(503).json({ error: "Google OAuth is not configured" });
    return;
  }

  const forwardedProto = req.headers?.["x-forwarded-proto"]?.split(",")[0]?.trim();
  const protocol = forwardedProto || "https";
  const host = req.headers?.host;
  const requestCallbackUrl = `${protocol}://${host}/api/auth/google/callback`;
  const configuredCallbackUrl = process.env.GOOGLE_CALLBACK_URL;
  let configuredHost: string | undefined;
  try {
    configuredHost = configuredCallbackUrl ? new URL(configuredCallbackUrl).host : undefined;
  } catch {
    configuredHost = undefined;
  }
  const callbackUrl = configuredCallbackUrl && configuredHost === host
    ? configuredCallbackUrl
    : requestCallbackUrl;

  try {
    const tokenResponse = await fetchWithTimeout(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          grant_type: "authorization_code",
        }),
      },
    );
    const tokenData = (await tokenResponse.json()) as {
      access_token?: unknown;
      error?: unknown;
      error_description?: unknown;
    };
    const accessToken = tokenData.access_token;
    if (!tokenResponse.ok || typeof accessToken !== "string" || !accessToken) {
      console.error("[Google OAuth] Token exchange rejected", {
        status: tokenResponse.status,
        error: tokenData.error,
        error_description: tokenData.error_description,
      });
      res.status(502).json({
        error: "Google did not return an access token",
      });
      return;
    }

    const userResponse = await fetchWithTimeout(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const profile = (await userResponse.json()) as {
      sub?: string;
      email?: string;
      name?: string;
    };
    if (!userResponse.ok || !profile.sub || !profile.email) {
      res.status(502).json({ error: "Google profile is missing required identity fields" });
      return;
    }

    const openId = `google:${profile.sub}`;
    try {
      // Profile persistence is optional for authentication. Keep the OAuth
      // callback independent from database driver/schema failures so a bad
      // DATABASE_URL cannot turn a successful Google login into a 500.
      const db = await import("../../../server/db.js");
      await db.upsertUser({
        openId,
        name: profile.name ?? profile.email.split("@")[0] ?? "Google user",
        email: profile.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });
    } catch (error) {
      // Keep authentication available if the optional profile persistence database is down.
      console.error("[Google OAuth] User persistence unavailable; continuing login", error);
    }
    const sessionToken = await createSessionToken(openId, profile.name ?? profile.email);

    res.setHeader("Set-Cookie", [
      `google_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      `${COOKIE_NAME}=${sessionToken}; ${getCookieOptions()}`,
    ]);
    res.redirect(302, "/");
  } catch (error) {
    console.error("[Google OAuth] Callback failed", error);
    res.status(500).json({ error: "Google OAuth callback failed" });
  }
}

export const config = { runtime: "nodejs" };
