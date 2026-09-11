import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../../shared/const";
import * as db from "../../../server/db";
import { sdk } from "../../../server/_core/sdk";

function getCookieOptions() {
  return `Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}`;
}

export default async function handler(req: any, res: any) {
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
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || `${protocol}://${host}/api/auth/google/callback`;

  try {
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 30000 },
    );
    const accessToken = tokenResponse.data?.access_token;
    if (typeof accessToken !== "string" || !accessToken) {
      res.status(502).json({ error: "Google did not return an access token" });
      return;
    }

    const userResponse = await axios.get("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 30000,
    });
    const profile = userResponse.data as { sub?: string; email?: string; name?: string };
    if (!profile.sub || !profile.email) {
      res.status(502).json({ error: "Google profile is missing required identity fields" });
      return;
    }

    const openId = `google:${profile.sub}`;
    await db.upsertUser({
      openId,
      name: profile.name ?? profile.email.split("@")[0] ?? "Google user",
      email: profile.email,
      loginMethod: "google",
      lastSignedIn: new Date(),
    });
    const sessionToken = await sdk.createSessionToken(openId, {
      name: profile.name ?? profile.email,
      expiresInMs: ONE_YEAR_MS,
    });

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
