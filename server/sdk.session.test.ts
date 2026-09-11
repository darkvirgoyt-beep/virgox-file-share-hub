import { beforeEach, describe, expect, it, vi } from "vitest";

describe("session verification", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("JWT_SECRET", "test-session-secret");
    vi.stubEnv("VITE_APP_ID", "");
  });

  it("accepts a valid locally signed Google session without a Manus app id", async () => {
    const { sdk } = await import("./_core/sdk");
    const token = await sdk.signSession({
      openId: "google:123456789",
      appId: "",
      name: "Google User",
    });

    await expect(sdk.verifySession(token)).resolves.toMatchObject({
      openId: "google:123456789",
      appId: "",
      name: "Google User",
    });
  });
});
