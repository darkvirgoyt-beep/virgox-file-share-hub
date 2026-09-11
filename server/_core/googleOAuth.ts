import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const STATE_COOKIE = "google_oauth_state";
const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
function getCallbackUrl(req: Request) {
  if (ENV.googleCallbackUrl) return ENV.googleCallbackUrl;
  const protocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim() || req.protocol;
  return `${protocol}://${req.get("host")}/api/auth/google/callback`;
}

function setStateCookie(res: Response, state: string) {
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: "/",
  });
}

export function registerGoogleOAuthRoutes(app: Express) {
  app.get("/api/auth/google/start", (req: Request, res: Response) => {
    if (!ENV.googleClientId) {
      res.status(503).json({ error: "Google OAuth is not configured" });
      return;
    }

    const state = crypto.randomBytes(32).toString("hex");
    setStateCookie(res, state);
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: getCallbackUrl(req),
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    res.redirect(`${GOOGLE_AUTHORIZE_URL}?${params.toString()}`);
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const cookies = parseCookieHeader(req.headers.cookie ?? "");

    if (!code || !state || state !== cookies[STATE_COOKIE]) {
      res.status(403).json({ error: "Invalid Google OAuth state" });
      return;
    }
    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      res.status(503).json({ error: "Google OAuth is not configured" });
      return;
    }

    try {
      const tokenResponse = await axios.post(
        GOOGLE_TOKEN_URL,
        new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: getCallbackUrl(req),
          grant_type: "authorization_code",
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 30000 },
      );
      const accessToken = tokenResponse.data?.access_token;
      if (typeof accessToken !== "string" || !accessToken) {
        res.status(502).json({ error: "Google did not return an access token" });
        return;
      }

      const userResponse = await axios.get(GOOGLE_USERINFO_URL, {
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
      res.clearCookie(STATE_COOKIE, { path: "/" });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Google OAuth] Callback failed", error);
      res.status(500).json({ error: "Google OAuth callback failed" });
    }
  });
}
