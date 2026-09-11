import crypto from "node:crypto";

export default function handler(req: any, res: any) {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  if (!clientId) {
    res.status(503).json({ error: "Google OAuth is not configured" });
    return;
  }

  const state = crypto.randomBytes(32).toString("hex");
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
  // Do not send OAuth to an old Vercel deployment hostname after a project
  // rename. Keep an explicitly configured callback only when it matches the
  // hostname the user is currently visiting.
  const callbackUrl = configuredCallbackUrl && configuredHost === host
    ? configuredCallbackUrl
    : requestCallbackUrl;

  res.setHeader(
    "Set-Cookie",
    `google_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
