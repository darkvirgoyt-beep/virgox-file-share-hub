import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import { storageGetSignedUrl } from "./storage.js";
import {
  createReport,
  canAccessStoredFile,
  createAuditLog,
  createVideoDraft,
  getProfileByUserId,
  getPublicFeed,
  getPublicGroups,
  createProfile,
  recordVideoView,
  listOwnedFiles,
  updateStoredFileScanStatus,
} from "./db.js";

const visibilitySchema = z.enum(["public", "followers", "private"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  feed: router({
    public: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(30) }).optional()).query(({ input }) => getPublicFeed(input?.limit ?? 30)),
  }),
  profiles: router({
    me: protectedProcedure.query(({ ctx }) => getProfileByUserId(ctx.user.id)),
    create: protectedProcedure.input(z.object({
      username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
      displayName: z.string().trim().min(1).max(120),
    })).mutation(({ ctx, input }) => createProfile({ ...input, userId: ctx.user.id })),
  }),
  groups: router({
    public: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(30) }).optional()).query(({ input }) => getPublicGroups(input?.limit ?? 30)),
  }),
  files: router({
    mine: protectedProcedure.input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).max(100_000).default(0),
    }).optional()).query(({ ctx, input }) => listOwnedFiles(ctx.user.id, input?.limit ?? 50, input?.offset ?? 0)),
    downloadUrl: protectedProcedure.input(z.object({ fileId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const file = await canAccessStoredFile(input.fileId, ctx.user.id);
      if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "File is unavailable" });
      const url = await storageGetSignedUrl(file.storageKey);
      await createAuditLog({ actorId: ctx.user.id, action: "file.download_url", resourceType: "file", resourceId: file.id });
      return { url, expiresInSeconds: 300 } as const;
    }),
    setScanStatus: adminProcedure.input(z.object({
      fileId: z.number().int().positive(),
      status: z.enum(["pending", "clean", "blocked"]),
    })).mutation(async ({ ctx, input }) => {
      await updateStoredFileScanStatus(input.fileId, input.status);
      await createAuditLog({ actorId: ctx.user.id, action: "file.scan_status", resourceType: "file", resourceId: input.fileId, metadata: { status: input.status } });
      return { success: true } as const;
    }),
  }),
  videos: router({
    createDraft: protectedProcedure.input(z.object({
      title: z.string().trim().min(1).max(180),
      description: z.string().trim().max(5000).optional(),
      storageKey: z.string().trim().min(1).max(500),
      thumbnailKey: z.string().trim().max(500).optional(),
      durationSeconds: z.number().int().min(1).max(180),
      category: z.string().trim().max(80).optional(),
      tags: z.string().trim().max(1000).optional(),
      hashtags: z.string().trim().max(1000).optional(),
      visibility: visibilitySchema.default("public"),
    })).mutation(async ({ ctx, input }) => createVideoDraft({ ...input, creatorId: ctx.user.id })),
    recordView: protectedProcedure.input(z.object({
      videoId: z.number().int().positive(),
      watchSeconds: z.number().int().min(0).max(180),
      completed: z.boolean(),
    })).mutation(({ ctx, input }) => recordVideoView({ ...input, userId: ctx.user.id })),
  }),
  moderation: router({
    report: protectedProcedure.input(z.object({
      targetType: z.enum(["video", "post", "comment", "profile", "group", "file"]),
      targetId: z.number().int().positive(),
      reason: z.string().trim().min(3).max(160),
    })).mutation(({ ctx, input }) => createReport({ ...input, reporterId: ctx.user.id })),
  }),
});

export type AppRouter = typeof appRouter;

export function assertOwner(ownerId: number, currentUserId: number) {
  if (ownerId !== currentUserId) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to access this resource." });
}
