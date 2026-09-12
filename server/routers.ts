import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import { storageGetSignedUrl, storagePut } from "./storage.js";
import {
  createReport,
  createStoredFile,
  canAccessStoredFile,
  createAuditLog,
  createVideoDraft,
  getProfileByUserId,
  getPublicFeed,
  getPublicGroups,
  getPublicPosts,
  getFollowingFeed,
  listVideoComments,
  createComment,
  createPost,
  followUser,
  unfollowUser,
  toggleVideoLike,
  createGroup,
  joinGroup,
  leaveGroup,
  listNotifications,
  markNotificationRead,
  createProfile,
  updateProfile,
  recordVideoView,
  searchUsers,
  listOwnedFiles,
  updateStoredFileScanStatus,
} from "./db.js";
import {
  listConversationMessages,
  listFriendRequests,
  listFriends,
  respondToFriendRequest,
  sendFriendRequest,
  sendMessage,
} from "./social.js";

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
  notifications: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).max(100_000).default(0) }).optional()).query(({ ctx, input }) => listNotifications(ctx.user.id, input?.limit ?? 50, input?.offset ?? 0)),
    markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => markNotificationRead(ctx.user.id, input.notificationId)),
  }),
  social: router({
    requests: protectedProcedure.query(({ ctx }) => listFriendRequests(ctx.user.id)),
    friends: protectedProcedure.query(({ ctx }) => listFriends(ctx.user.id)),
    request: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(({ ctx, input }) => sendFriendRequest(ctx.user.id, input.userId)),
    respond: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), status: z.enum(["accepted", "declined"]) })).mutation(({ ctx, input }) => respondToFriendRequest(ctx.user.id, input.requestId, input.status)),
    messages: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).query(({ ctx, input }) => listConversationMessages(ctx.user.id, input.userId)),
    sendMessage: protectedProcedure.input(z.object({ userId: z.number().int().positive(), body: z.string().trim().max(5000).optional(), fileId: z.number().int().positive().optional() })).mutation(({ ctx, input }) => sendMessage(ctx.user.id, input.userId, input.body, input.fileId)),
  }),
  feed: router({
    public: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(30) }).optional()).query(({ input }) => getPublicFeed(input?.limit ?? 30)),
    posts: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(30), offset: z.number().int().min(0).max(100_000).default(0) }).optional()).query(({ input }) => getPublicPosts(input?.limit ?? 30, input?.offset ?? 0)),
    following: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(30), offset: z.number().int().min(0).max(100_000).default(0) }).optional()).query(({ ctx, input }) => getFollowingFeed(ctx.user.id, input?.limit ?? 30, input?.offset ?? 0)),
  }),
  profiles: router({
    me: protectedProcedure.query(({ ctx }) => getProfileByUserId(ctx.user.id)),
    create: protectedProcedure.input(z.object({
      username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
      displayName: z.string().trim().min(1).max(120),
    })).mutation(({ ctx, input }) => createProfile({ ...input, userId: ctx.user.id })),
    update: protectedProcedure.input(z.object({
      username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
      displayName: z.string().trim().min(1).max(120),
      bio: z.string().trim().max(1000).nullable().optional(),
      avatarDataUrl: z.string().startsWith("data:").max(8_000_000).optional(),
      coverDataUrl: z.string().startsWith("data:").max(12_000_000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const uploadImage = async (dataUrl: string | undefined, name: string) => {
        if (!dataUrl) return undefined;
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid image data" });
        const result = await storagePut(`profiles/${ctx.user.id}/${name}`, Buffer.from(match[2], "base64"), match[1]);
        return result.key;
      };
      return updateProfile({ userId: ctx.user.id, username: input.username, displayName: input.displayName, bio: input.bio, avatarUrl: await uploadImage(input.avatarDataUrl, "avatar"), coverImageUrl: await uploadImage(input.coverDataUrl, "cover") });
    }),
    follow: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(({ ctx, input }) => followUser(ctx.user.id, input.userId)),
    unfollow: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(({ ctx, input }) => unfollowUser(ctx.user.id, input.userId)),
    search: protectedProcedure.input(z.object({ query: z.string().trim().min(2).max(80) })).query(({ ctx, input }) => searchUsers(input.query, ctx.user.id)),
  }),
  groups: router({
    public: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(30) }).optional()).query(({ input }) => getPublicGroups(input?.limit ?? 30)),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(120), slug: z.string().trim().min(3).max(140).regex(/^[a-z0-9-]+$/), description: z.string().trim().max(5000).optional(), visibility: z.enum(["public", "private"]).default("public") })).mutation(({ ctx, input }) => createGroup({ ...input, ownerId: ctx.user.id })),
    join: protectedProcedure.input(z.object({ groupId: z.number().int().positive() })).mutation(({ ctx, input }) => joinGroup(input.groupId, ctx.user.id)),
    leave: protectedProcedure.input(z.object({ groupId: z.number().int().positive() })).mutation(({ ctx, input }) => leaveGroup(input.groupId, ctx.user.id)),
  }),
  files: router({
    upload: protectedProcedure.input(z.object({
      name: z.string().trim().min(1).max(255),
      mimeType: z.string().trim().min(1).max(120),
      dataUrl: z.string().startsWith("data:").max(48_000_000),
    })).mutation(async ({ ctx, input }) => {
      const match = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match || match[1] !== input.mimeType) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid file data" });
      const buffer = Buffer.from(match[2], "base64");
      if (buffer.byteLength > 35 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Files must be 35 MB or smaller" });
      const result = await storagePut(`files/${ctx.user.id}/${input.name}`, buffer, input.mimeType);
      const created = await createStoredFile({ ownerId: ctx.user.id, originalName: input.name, storageKey: result.key, mimeType: input.mimeType, sizeBytes: buffer.byteLength });
      return { ...result, id: created.id, sizeBytes: buffer.byteLength };
    }),
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
    like: protectedProcedure.input(z.object({ videoId: z.number().int().positive() })).mutation(({ ctx, input }) => toggleVideoLike(ctx.user.id, input.videoId)),
    comments: publicProcedure.input(z.object({ videoId: z.number().int().positive(), limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).max(100_000).default(0) })).query(({ input }) => listVideoComments(input.videoId, input.limit, input.offset)),
    comment: protectedProcedure.input(z.object({ videoId: z.number().int().positive(), body: z.string().trim().min(1).max(1000) })).mutation(({ ctx, input }) => createComment({ ...input, authorId: ctx.user.id })),
  }),
  posts: router({
    create: protectedProcedure.input(z.object({
      body: z.string().trim().min(1).max(10_000),
      visibility: z.enum(["public", "followers", "group", "private"]).default("public"),
      groupId: z.number().int().positive().optional(),
      mediaKey: z.string().trim().max(500).optional(),
    })).mutation(({ ctx, input }) => createPost({ ...input, authorId: ctx.user.id })),
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
