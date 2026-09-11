import { and, desc, eq, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  groups,
  groupMembers,
  InsertUser,
  profiles,
  reports,
  auditLogs,
  comments,
  follows,
  posts,
  storedFiles,
  User,
  users,
  videoInteractions,
  videos,
} from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect");
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  for (const field of textFields) {
    if (user[field] !== undefined) {
      const value = user[field] ?? null;
      values[field] = value;
      updateSet[field] = value;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    id: profiles.id,
    username: profiles.username,
    displayName: profiles.displayName,
    bio: profiles.bio,
    avatarUrl: profiles.avatarUrl,
    coverImageUrl: profiles.coverImageUrl,
    followersCount: profiles.followersCount,
    followingCount: profiles.followingCount,
  }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result[0];
}

export async function createProfile(input: {
  userId: number;
  username: string;
  displayName: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable while creating profile");
  await db.insert(profiles).values({
    userId: input.userId,
    username: input.username,
    displayName: input.displayName,
  });
  return getProfileByUserId(input.userId);
}

export async function getPublicFeed(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: videos.id,
    creatorId: videos.creatorId,
    title: videos.title,
    description: videos.description,
    thumbnailKey: videos.thumbnailKey,
    durationSeconds: videos.durationSeconds,
    category: videos.category,
    tags: videos.tags,
    hashtags: videos.hashtags,
    viewsCount: videos.viewsCount,
    likesCount: videos.likesCount,
    commentsCount: videos.commentsCount,
    sharesCount: videos.sharesCount,
    createdAt: videos.createdAt,
  }).from(videos)
    .where(eq(videos.processingStatus, "ready"))
    .orderBy(desc(videos.createdAt))
    .limit(Math.min(Math.max(limit, 1), 50));
}

export async function getPublicGroups(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: groups.id,
    name: groups.name,
    slug: groups.slug,
    description: groups.description,
    visibility: groups.visibility,
    profileImageUrl: groups.profileImageUrl,
    coverImageUrl: groups.coverImageUrl,
    createdAt: groups.createdAt,
  }).from(groups).where(eq(groups.visibility, "public")).orderBy(desc(groups.createdAt)).limit(Math.min(Math.max(limit, 1), 50));
}

export async function createVideoDraft(input: {
  creatorId: number;
  title: string;
  description?: string;
  storageKey: string;
  thumbnailKey?: string;
  durationSeconds: number;
  category?: string;
  tags?: string;
  hashtags?: string;
  visibility: "public" | "followers" | "private";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(videos).values({ ...input, processingStatus: "pending" });
  return { id: result[0].insertId, processingStatus: "pending" as const };
}

export async function recordVideoView(input: {
  userId: number;
  videoId: number;
  watchSeconds: number;
  completed: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(videoInteractions).values({ ...input, type: "view" });
}

export async function createReport(input: {
  reporterId: number;
  targetType: "video" | "post" | "comment" | "profile" | "group" | "file";
  targetId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(reports).values(input);
  return { success: true } as const;
}

export async function createAuditLog(input: {
  actorId?: number;
  action: string;
  resourceType?: string;
  resourceId?: number;
  requestId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLogs).values(input);
  } catch (error) {
    // Audit logging must not turn an otherwise authorized user action into a
    // failed request during rolling migrations or a temporary audit-table outage.
    console.error("[AuditLog] persistence failed", {
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
}

export async function getStoredFileById(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(storedFiles).where(eq(storedFiles.id, fileId)).limit(1);
  return result[0];
}

export async function canAccessStoredFile(fileId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select({ file: storedFiles })
    .from(storedFiles)
    .leftJoin(groupMembers, and(
      eq(groupMembers.groupId, storedFiles.groupId),
      eq(groupMembers.userId, userId),
      eq(groupMembers.status, "active"),
    ))
    .where(and(
      eq(storedFiles.id, fileId),
      eq(storedFiles.scanStatus, "clean"),
      or(
        eq(storedFiles.visibility, "public"),
        eq(storedFiles.ownerId, userId),
        eq(groupMembers.userId, userId),
      ),
    )).limit(1);
  return result[0]?.file;
}

export async function listOwnedFiles(userId: number, limit: number, offset: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({
    id: storedFiles.id,
    originalName: storedFiles.originalName,
    mimeType: storedFiles.mimeType,
    sizeBytes: storedFiles.sizeBytes,
    scanStatus: storedFiles.scanStatus,
    visibility: storedFiles.visibility,
    createdAt: storedFiles.createdAt,
  }).from(storedFiles)
    .where(eq(storedFiles.ownerId, userId))
    .orderBy(desc(storedFiles.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updateStoredFileScanStatus(fileId: number, scanStatus: "pending" | "clean" | "blocked") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(storedFiles).set({ scanStatus }).where(eq(storedFiles.id, fileId));
}

export async function followUser(followerId: number, followingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (followerId === followingId) throw new Error("You cannot follow yourself");
  const existing = await db.select({ id: follows.id }).from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))).limit(1);
  if (!existing[0]) {
    await db.insert(follows).values({ followerId, followingId });
    await db.update(profiles).set({ followingCount: sql`${profiles.followingCount} + 1` }).where(eq(profiles.userId, followerId));
    await db.update(profiles).set({ followersCount: sql`${profiles.followersCount} + 1` }).where(eq(profiles.userId, followingId));
  }
  return { following: true } as const;
}

export async function unfollowUser(followerId: number, followingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
  if (result[0].affectedRows > 0) {
    await db.update(profiles).set({ followingCount: sql`greatest(${profiles.followingCount} - 1, 0)` }).where(eq(profiles.userId, followerId));
    await db.update(profiles).set({ followersCount: sql`greatest(${profiles.followersCount} - 1, 0)` }).where(eq(profiles.userId, followingId));
  }
  return { following: false } as const;
}

export async function toggleVideoLike(userId: number, videoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select({ id: videoInteractions.id }).from(videoInteractions)
    .where(and(eq(videoInteractions.userId, userId), eq(videoInteractions.videoId, videoId), eq(videoInteractions.type, "like"))).limit(1);
  if (existing[0]) {
    await db.delete(videoInteractions).where(eq(videoInteractions.id, existing[0].id));
    await db.update(videos).set({ likesCount: sql`greatest(${videos.likesCount} - 1, 0)` }).where(eq(videos.id, videoId));
    return { liked: false } as const;
  }
  await db.insert(videoInteractions).values({ userId, videoId, type: "like" });
  await db.update(videos).set({ likesCount: sql`${videos.likesCount} + 1` }).where(eq(videos.id, videoId));
  return { liked: true } as const;
}

export async function createComment(input: { authorId: number; videoId?: number; postId?: number; body: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(comments).values(input);
  if (input.videoId) await db.update(videos).set({ commentsCount: sql`${videos.commentsCount} + 1` }).where(eq(videos.id, input.videoId));
  return { id: result[0].insertId } as const;
}

export async function listVideoComments(videoId: number, limit: number, offset: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({ id: comments.id, authorId: comments.authorId, body: comments.body, createdAt: comments.createdAt })
    .from(comments).where(eq(comments.videoId, videoId)).orderBy(desc(comments.createdAt)).limit(limit).offset(offset);
}

export async function createPost(input: { authorId: number; body: string; visibility: "public" | "followers" | "group" | "private"; groupId?: number; mediaKey?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(posts).values(input);
  return { id: result[0].insertId } as const;
}

export async function getPublicPosts(limit: number, offset: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({ id: posts.id, authorId: posts.authorId, body: posts.body, mediaKey: posts.mediaKey, createdAt: posts.createdAt })
    .from(posts).where(eq(posts.visibility, "public")).orderBy(desc(posts.createdAt)).limit(limit).offset(offset);
}
