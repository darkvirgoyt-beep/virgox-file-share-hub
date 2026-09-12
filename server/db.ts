import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  groups,
  groupMembers,
  InsertUser,
  profiles,
  reports,
  auditLogs,
  comments,
  conversations,
  follows,
  friendRequests,
  messages,
  posts,
  notifications,
  storedFiles,
  User,
  users,
  videoInteractions,
  videos,
} from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";

let _db: ReturnType<typeof drizzle> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;
let _schemaReady: Promise<void> | null = null;

function getPostgresUrl(raw: string) {
  const url = new URL(raw.replace(/^mysql:/, "postgres:"));
  if (url.hostname.startsWith("db.") && url.hostname.endsWith(".supabase.co")) {
    const ref = url.hostname.slice(3, -".supabase.co".length);
    url.hostname = process.env.SUPABASE_POOLER_HOST ?? "aws-0-ap-south-1.pooler.supabase.com";
    url.port = process.env.SUPABASE_POOLER_PORT ?? "6543";
    if (url.username === "postgres") url.username = `postgres.${ref}`;
  }
  return url.toString();
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _sql = postgres(getPostgresUrl(process.env.DATABASE_URL), { max: 5, connect_timeout: 5, ssl: "require" });
      _db = drizzle(_sql);
      const sqlClient = _sql;
      _schemaReady = (async () => {
        await sqlClient`CREATE TABLE IF NOT EXISTS users (id serial PRIMARY KEY, "openId" varchar(64) NOT NULL UNIQUE, name text, email varchar(320), "loginMethod" varchar(64), role varchar(64) NOT NULL DEFAULT 'user', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "lastSignedIn" timestamptz NOT NULL DEFAULT now())`;
        await sqlClient`CREATE TABLE IF NOT EXISTS profiles (id serial PRIMARY KEY, "userId" integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, username varchar(32) NOT NULL UNIQUE, "displayName" varchar(120) NOT NULL, bio text, "avatarUrl" text, "coverImageUrl" text, "followersCount" integer NOT NULL DEFAULT 0, "followingCount" integer NOT NULL DEFAULT 0, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`;
        await sqlClient`CREATE TABLE IF NOT EXISTS friend_requests (id serial PRIMARY KEY, "requesterId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, "recipientId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, status varchar(24) NOT NULL DEFAULT 'pending', "createdAt" timestamptz NOT NULL DEFAULT now(), "respondedAt" timestamptz, CONSTRAINT friend_request_pair UNIQUE ("requesterId", "recipientId"))`;
        await sqlClient`CREATE TABLE IF NOT EXISTS conversations (id serial PRIMARY KEY, "userAId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, "userBId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, "createdAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT conversation_pair UNIQUE ("userAId", "userBId"))`;
        await sqlClient`CREATE TABLE IF NOT EXISTS messages (id serial PRIMARY KEY, "conversationId" integer NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, "senderId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, body text, "fileId" integer, "createdAt" timestamptz NOT NULL DEFAULT now())`;
      })();
      await _schemaReady;
    } catch (error) {
      console.warn("[Database] Failed to connect or bootstrap auth tables", error instanceof Error ? error.message : "unknown error");
      _sql = null;
      _db = null;
      _schemaReady = null;
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

  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
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

export async function updateProfile(input: {
  userId: number;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable while updating profile");
  const existing = await getProfileByUserId(input.userId);
  const values = {
    username: input.username,
    displayName: input.displayName,
    bio: input.bio ?? null,
    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
  };
  if (existing) {
    await db.update(profiles).set(values).where(eq(profiles.userId, input.userId));
  } else {
    await db.insert(profiles).values({ userId: input.userId, ...values });
  }
  return getProfileByUserId(input.userId);
}

export async function createStoredFile(input: {
  ownerId: number;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable while saving file metadata");
  const result = await db.insert(storedFiles).values({
    ...input,
    scanStatus: "clean",
    visibility: "private",
  }).returning({ id: storedFiles.id });
  return result[0];
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
  const result = await db.insert(videos).values({ ...input, processingStatus: "pending" }).returning({ id: videos.id });
  return { id: result[0].id, processingStatus: "pending" as const };
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

export async function createNotification(input: {
  recipientId: number;
  actorId?: number;
  type: string;
  resourceType?: string;
  resourceId?: number;
  title: string;
  body?: string;
}) {
  const db = await getDb();
  if (!db || input.recipientId === input.actorId) return;
  await db.insert(notifications).values(input);
}

export async function listNotifications(userId: number, limit: number, offset: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({ id: notifications.id, actorId: notifications.actorId, type: notifications.type, resourceType: notifications.resourceType, resourceId: notifications.resourceId, title: notifications.title, body: notifications.body, readAt: notifications.readAt, createdAt: notifications.createdAt })
    .from(notifications).where(eq(notifications.recipientId, userId)).orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, userId)));
  return { success: true } as const;
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

export async function searchUsers(query: string, currentUserId: number) {
  const db = await getDb();
  if (!db) return [];
  const normalized = query.trim();
  if (normalized.length < 2) return [];
  const pattern = `%${normalized}%`;
  const results = await db.select({
    id: users.id,
    name: users.name,
    username: profiles.username,
    displayName: profiles.displayName,
    avatarUrl: profiles.avatarUrl,
  }).from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(
      sql`${users.id} <> ${currentUserId}`,
      or(
        ilike(users.name, pattern),
        ilike(profiles.username, pattern),
        ilike(profiles.displayName, pattern),
      ),
    ))
    .limit(20);
  return results.map((result) => ({
    ...result,
    username: result.username ?? result.name?.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 32) ?? "member",
    displayName: result.displayName ?? result.name ?? "VirgoX member",
  }));
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
    await createNotification({ recipientId: followingId, actorId: followerId, type: "follow", resourceType: "profile", resourceId: followingId, title: "New follower" });
  }
  return { following: true } as const;
}

export async function unfollowUser(followerId: number, followingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))).returning({ id: follows.id });
  if (result.length > 0) {
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
  const owner = await db.select({ creatorId: videos.creatorId }).from(videos).where(eq(videos.id, videoId)).limit(1);
  if (owner[0]) await createNotification({ recipientId: owner[0].creatorId, actorId: userId, type: "like", resourceType: "video", resourceId: videoId, title: "Your video was liked" });
  return { liked: true } as const;
}

export async function createComment(input: { authorId: number; videoId?: number; postId?: number; body: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(comments).values(input).returning({ id: comments.id });
  if (input.videoId) await db.update(videos).set({ commentsCount: sql`${videos.commentsCount} + 1` }).where(eq(videos.id, input.videoId));
  if (input.videoId) {
    const owner = await db.select({ creatorId: videos.creatorId }).from(videos).where(eq(videos.id, input.videoId)).limit(1);
    if (owner[0]) await createNotification({ recipientId: owner[0].creatorId, actorId: input.authorId, type: "comment", resourceType: "video", resourceId: input.videoId, title: "New comment on your video" });
  }
  return { id: result[0].id } as const;
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
  const result = await db.insert(posts).values(input).returning({ id: posts.id });
  return { id: result[0].id } as const;
}

export async function getPublicPosts(limit: number, offset: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({ id: posts.id, authorId: posts.authorId, body: posts.body, mediaKey: posts.mediaKey, createdAt: posts.createdAt })
    .from(posts).where(eq(posts.visibility, "public")).orderBy(desc(posts.createdAt)).limit(limit).offset(offset);
}

export async function getFollowingFeed(userId: number, limit: number, offset: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
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
    .innerJoin(follows, eq(follows.followingId, videos.creatorId))
    .where(and(eq(follows.followerId, userId), eq(videos.processingStatus, "ready")))
    .orderBy(desc(videos.createdAt)).limit(limit).offset(offset);
}

export async function createGroup(input: { ownerId: number; name: string; slug: string; description?: string; visibility: "public" | "private" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(groups).values(input).returning({ id: groups.id });
  const groupId = result[0].id;
  await db.insert(groupMembers).values({ groupId, userId: input.ownerId, role: "owner", status: "active" });
  return { id: groupId } as const;
}

export async function joinGroup(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const group = await db.select({ visibility: groups.visibility }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!group[0]) throw new Error("Group not found");
  const existing = await db.select({ id: groupMembers.id, status: groupMembers.status }).from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))).limit(1);
  const status = group[0].visibility === "private" ? "pending" : "active";
  if (existing[0]) return { status: existing[0].status } as const;
  await db.insert(groupMembers).values({ groupId, userId, role: "member", status });
  return { status } as const;
}

export async function leaveGroup(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId), eq(groupMembers.role, "member")));
  return { success: true } as const;
}
