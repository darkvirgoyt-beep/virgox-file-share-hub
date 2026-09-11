import { boolean, integer, json, pgTable, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";

/** Core user table backing Manus auth. Never expose openId or internal role fields to clients. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 64 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  coverImageUrl: text("coverImageUrl"),
  followersCount: integer("followersCount").default(0).notNull(),
  followingCount: integer("followingCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("followerId").notNull(),
  followingId: integer("followingId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ followPair: unique("follow_pair").on(table.followerId, table.followingId) }));

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  description: text("description"),
  visibility: varchar("visibility", { length: 64 }).default("public").notNull(),
  profileImageUrl: text("profileImageUrl"),
  coverImageUrl: text("coverImageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("groupId").notNull(),
  userId: integer("userId").notNull(),
  role: varchar("role", { length: 64 }).default("member").notNull(),
  status: varchar("status", { length: 64 }).default("active").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (table) => ({ groupUser: unique("group_user").on(table.groupId, table.userId) }));

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  creatorId: integer("creatorId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  storageKey: text("storageKey").notNull(),
  thumbnailKey: text("thumbnailKey"),
  durationSeconds: integer("durationSeconds").notNull(),
  category: varchar("category", { length: 80 }),
  tags: text("tags"),
  hashtags: text("hashtags"),
  visibility: varchar("visibility", { length: 64 }).default("public").notNull(),
  processingStatus: varchar("processingStatus", { length: 64 }).default("pending").notNull(),
  viewsCount: integer("viewsCount").default(0).notNull(),
  likesCount: integer("likesCount").default(0).notNull(),
  commentsCount: integer("commentsCount").default(0).notNull(),
  sharesCount: integer("sharesCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export const videoInteractions = pgTable("video_interactions", {
  id: serial("id").primaryKey(),
  videoId: integer("videoId").notNull(),
  userId: integer("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  watchSeconds: integer("watchSeconds").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: integer("authorId").notNull(),
  groupId: integer("groupId"),
  body: text("body").notNull(),
  mediaKey: text("mediaKey"),
  visibility: varchar("visibility", { length: 64 }).default("public").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  videoId: integer("videoId"),
  postId: integer("postId"),
  authorId: integer("authorId").notNull(),
  body: varchar("body", { length: 1000 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const storedFiles = pgTable("stored_files", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  groupId: integer("groupId"),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  storageKey: text("storageKey").notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: integer("sizeBytes").notNull(),
  scanStatus: varchar("scanStatus", { length: 64 }).default("pending").notNull(),
  visibility: varchar("visibility", { length: 64 }).default("private").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporterId").notNull(),
  targetType: varchar("targetType", { length: 64 }).notNull(),
  targetId: integer("targetId").notNull(),
  reason: varchar("reason", { length: 160 }).notNull(),
  status: varchar("status", { length: 64 }).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  blockerId: integer("blockerId").notNull(),
  blockedId: integer("blockedId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ blockPair: unique("block_pair").on(table.blockerId, table.blockedId) }));

export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  query: varchar("query", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actorId"),
  action: varchar("action", { length: 80 }).notNull(),
  resourceType: varchar("resourceType", { length: 80 }),
  resourceId: integer("resourceId"),
  requestId: varchar("requestId", { length: 80 }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipientId").notNull(),
  actorId: integer("actorId"),
  type: varchar("type", { length: 40 }).notNull(),
  resourceType: varchar("resourceType", { length: 40 }),
  resourceId: integer("resourceId"),
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
