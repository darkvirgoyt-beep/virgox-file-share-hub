import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing Manus auth. Never expose openId or internal role fields to clients. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  coverImageUrl: text("coverImageUrl"),
  followersCount: int("followersCount").default(0).notNull(),
  followingCount: int("followingCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const follows = mysqlTable("follows", {
  id: int("id").autoincrement().primaryKey(),
  followerId: int("followerId").notNull(),
  followingId: int("followingId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ followPair: unique("follow_pair").on(table.followerId, table.followingId) }));

export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  description: text("description"),
  visibility: mysqlEnum("visibility", ["public", "private"]).default("public").notNull(),
  profileImageUrl: text("profileImageUrl"),
  coverImageUrl: text("coverImageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const groupMembers = mysqlTable("group_members", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "moderator", "member"]).default("member").notNull(),
  status: mysqlEnum("status", ["active", "pending", "blocked"]).default("active").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (table) => ({ groupUser: unique("group_user").on(table.groupId, table.userId) }));

export const videos = mysqlTable("videos", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creatorId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  storageKey: text("storageKey").notNull(),
  thumbnailKey: text("thumbnailKey"),
  durationSeconds: int("durationSeconds").notNull(),
  category: varchar("category", { length: 80 }),
  tags: text("tags"),
  hashtags: text("hashtags"),
  visibility: mysqlEnum("visibility", ["public", "followers", "private"]).default("public").notNull(),
  processingStatus: mysqlEnum("processingStatus", ["pending", "ready", "blocked", "failed"]).default("pending").notNull(),
  viewsCount: int("viewsCount").default(0).notNull(),
  likesCount: int("likesCount").default(0).notNull(),
  commentsCount: int("commentsCount").default(0).notNull(),
  sharesCount: int("sharesCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const videoInteractions = mysqlTable("video_interactions", {
  id: int("id").autoincrement().primaryKey(),
  videoId: int("videoId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["like", "save", "share", "view"]).notNull(),
  watchSeconds: int("watchSeconds").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  groupId: int("groupId"),
  body: text("body").notNull(),
  mediaKey: text("mediaKey"),
  visibility: mysqlEnum("visibility", ["public", "followers", "group", "private"]).default("public").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  videoId: int("videoId"),
  postId: int("postId"),
  authorId: int("authorId").notNull(),
  body: varchar("body", { length: 1000 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const storedFiles = mysqlTable("stored_files", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  groupId: int("groupId"),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  storageKey: text("storageKey").notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  scanStatus: mysqlEnum("scanStatus", ["pending", "clean", "blocked"]).default("pending").notNull(),
  visibility: mysqlEnum("visibility", ["private", "group", "public"]).default("private").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull(),
  targetType: mysqlEnum("targetType", ["video", "post", "comment", "profile", "group", "file"]).notNull(),
  targetId: int("targetId").notNull(),
  reason: varchar("reason", { length: 160 }).notNull(),
  status: mysqlEnum("status", ["open", "reviewing", "resolved", "dismissed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const blocks = mysqlTable("blocks", {
  id: int("id").autoincrement().primaryKey(),
  blockerId: int("blockerId").notNull(),
  blockedId: int("blockedId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ blockPair: unique("block_pair").on(table.blockerId, table.blockedId) }));

export const searchHistory = mysqlTable("search_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  query: varchar("query", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId"),
  action: varchar("action", { length: 80 }).notNull(),
  resourceType: varchar("resourceType", { length: 80 }),
  resourceId: int("resourceId"),
  requestId: varchar("requestId", { length: 80 }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipientId").notNull(),
  actorId: int("actorId"),
  type: varchar("type", { length: 40 }).notNull(),
  resourceType: varchar("resourceType", { length: 40 }),
  resourceId: int("resourceId"),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type StoredFile = typeof storedFiles.$inferSelect;
