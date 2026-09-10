import { describe, expect, it } from "vitest";
import axios from "axios";
import { ENV } from "./_core/env";

describe("Google OAuth configuration", () => {
  const productionCallback = "https://virgox-file-share-hub.vercel.app/api/auth/google/callback";

  it("accepts the configured web client at Google’s token endpoint", async () => {
    if (!ENV.googleClientId && !ENV.googleClientSecret && !ENV.googleCallbackUrl) return;
    expect(ENV.googleClientId).toMatch(/\.apps\.googleusercontent\.com$/);
    expect(ENV.googleClientSecret).toBeTruthy();
    expect(ENV.googleCallbackUrl).toBe(productionCallback);

    try {
      await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          code: "virgox-configuration-check",
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: ENV.googleCallbackUrl,
          grant_type: "authorization_code",
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 },
      );
      throw new Error("Google unexpectedly accepted the configuration-check code");
    } catch (error) {
      if (!axios.isAxiosError(error)) throw error;
      expect(error.response?.status).toBe(400);
      expect(String(error.response?.data?.error ?? "")).not.toBe("invalid_client");
    }
  }, 15000);
});
