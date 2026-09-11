import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  groups,
  InsertUser,
  profiles,
  reports,
  User,
  users,
  videoInteractions,
  videos,
} from "../drizzle/schema.js";
import { ENV } from "./_core/env";

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
