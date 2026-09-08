import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter, assertOwner } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "virgox-test-user",
    email: "test@example.com",
    name: "Virgo Test",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("VirgoX security guards", () => {
  it("rejects video drafts longer than the three-minute product limit", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.videos.createDraft({
      title: "Too long",
      storageKey: "42-files/video.mp4",
      durationSeconds: 181,
      visibility: "private",
    })).rejects.toBeDefined();
  });

  it("rejects ownership mismatches server-side", () => {
    expect(() => assertOwner(99, 42)).toThrowError(TRPCError);
    expect(() => assertOwner(42, 42)).not.toThrow();
  });
});
