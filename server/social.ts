import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { conversations, friendRequests, messages, profiles, storedFiles, users } from "../drizzle/schema.js";
import { createNotification, getDb } from "./db.js";
import { storageGetSignedUrl } from "./storage.js";

function orderedPair(a: number, b: number) {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

export async function sendFriendRequest(requesterId: number, recipientId: number) {
  if (requesterId === recipientId) throw new Error("You cannot add yourself");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(friendRequests).where(or(
    and(eq(friendRequests.requesterId, requesterId), eq(friendRequests.recipientId, recipientId)),
    and(eq(friendRequests.requesterId, recipientId), eq(friendRequests.recipientId, requesterId)),
  )).orderBy(desc(friendRequests.createdAt)).limit(1);
  if (existing[0]?.status === "accepted") return { status: "accepted" as const };
  if (existing[0]?.status === "pending") return { status: existing[0].requesterId === requesterId ? "pending" : "incoming" as const };
  const result = existing[0]
    ? await db.update(friendRequests).set({ requesterId, recipientId, status: "pending", respondedAt: null, createdAt: new Date() }).where(eq(friendRequests.id, existing[0].id)).returning({ id: friendRequests.id })
    : await db.insert(friendRequests).values({ requesterId, recipientId, status: "pending" }).returning({ id: friendRequests.id });
  await createNotification({ recipientId, actorId: requesterId, type: "friend_request", resourceType: "friend_request", resourceId: result[0].id, title: "New friend request", body: "Someone wants to connect with you on VirgoX." });
  return { status: "pending" as const, id: result[0].id };
}

export async function listFriendRequests(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({
    id: friendRequests.id,
    requesterId: friendRequests.requesterId,
    recipientId: friendRequests.recipientId,
    status: friendRequests.status,
    createdAt: friendRequests.createdAt,
    requesterName: users.name,
    username: profiles.username,
    displayName: profiles.displayName,
    avatarUrl: profiles.avatarUrl,
  }).from(friendRequests)
    .innerJoin(users, eq(users.id, sql`CASE WHEN ${friendRequests.requesterId} = ${userId} THEN ${friendRequests.recipientId} ELSE ${friendRequests.requesterId} END`))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(friendRequests.recipientId, userId), eq(friendRequests.status, "pending")))
    .orderBy(desc(friendRequests.createdAt));
}

export async function respondToFriendRequest(userId: number, requestId: number, status: "accepted" | "declined") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const request = await db.select().from(friendRequests).where(and(eq(friendRequests.id, requestId), eq(friendRequests.recipientId, userId), eq(friendRequests.status, "pending"))).limit(1);
  if (!request[0]) throw new Error("Friend request is unavailable");
  await db.update(friendRequests).set({ status, respondedAt: new Date() }).where(eq(friendRequests.id, requestId));
  if (status === "accepted") {
    const pair = orderedPair(request[0].requesterId, request[0].recipientId);
    await db.insert(conversations).values(pair).onConflictDoNothing();
    await createNotification({ recipientId: request[0].requesterId, actorId: userId, type: "friend_request_accepted", resourceType: "friend_request", resourceId: requestId, title: "Friend request accepted", body: "You can now chat and share files privately." });
  }
  return { status } as const;
}

export async function listFriends(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({
    id: users.id,
    name: users.name,
    username: profiles.username,
    displayName: profiles.displayName,
    avatarUrl: profiles.avatarUrl,
  }).from(friendRequests)
    .innerJoin(users, eq(users.id, sql`CASE WHEN ${friendRequests.requesterId} = ${userId} THEN ${friendRequests.recipientId} ELSE ${friendRequests.requesterId} END`))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(or(eq(friendRequests.requesterId, userId), eq(friendRequests.recipientId, userId)), eq(friendRequests.status, "accepted")))
    .orderBy(asc(profiles.displayName));
}

async function getConversationForMembers(userId: number, otherUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const pair = orderedPair(userId, otherUserId);
  const friendship = await db.select({ id: friendRequests.id }).from(friendRequests).where(and(or(and(eq(friendRequests.requesterId, pair.userAId), eq(friendRequests.recipientId, pair.userBId)), and(eq(friendRequests.requesterId, pair.userBId), eq(friendRequests.recipientId, pair.userAId))), eq(friendRequests.status, "accepted"))).limit(1);
  if (!friendship[0]) throw new Error("You can only message accepted friends");
  const existing = await db.select().from(conversations).where(and(eq(conversations.userAId, pair.userAId), eq(conversations.userBId, pair.userBId))).limit(1);
  if (existing[0]) return existing[0];
  // Opening a chat and sending a message can happen concurrently across
  // serverless instances. Reuse the unique pair constraint instead of
  // allowing the losing request to fail with a duplicate-key error.
  await db.insert(conversations).values(pair).onConflictDoNothing();
  const conversation = await db.select().from(conversations).where(and(eq(conversations.userAId, pair.userAId), eq(conversations.userBId, pair.userBId))).limit(1);
  if (!conversation[0]) throw new Error("Conversation could not be initialized");
  return conversation[0];
}

export async function listConversationMessages(userId: number, otherUserId: number, limit = 100) {
  const conversation = await getConversationForMembers(userId, otherUserId);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({
    id: messages.id,
    senderId: messages.senderId,
    body: messages.body,
    fileId: messages.fileId,
    fileName: storedFiles.originalName,
    createdAt: messages.createdAt,
  }).from(messages)
    .leftJoin(storedFiles, eq(storedFiles.id, messages.fileId))
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(asc(messages.createdAt)).limit(Math.min(Math.max(limit, 1), 200));
  return Promise.all(rows.map(async (row) => {
    if (!row.fileId) return { ...row, fileUrl: null };
    const file = await db.select({ storageKey: storedFiles.storageKey }).from(storedFiles).where(eq(storedFiles.id, row.fileId)).limit(1);
    return { ...row, fileUrl: file[0] ? await storageGetSignedUrl(file[0].storageKey) : null };
  }));
}

export async function sendMessage(userId: number, otherUserId: number, body?: string, fileId?: number) {
  if (!body?.trim() && !fileId) throw new Error("Message cannot be empty");
  const conversation = await getConversationForMembers(userId, otherUserId);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (fileId) {
    const file = await db.select({ id: storedFiles.id, ownerId: storedFiles.ownerId }).from(storedFiles).where(and(eq(storedFiles.id, fileId), eq(storedFiles.ownerId, userId))).limit(1);
    if (!file[0]) throw new Error("File is unavailable");
  }
  const result = await db.insert(messages).values({ conversationId: conversation.id, senderId: userId, body: body?.trim() || null, fileId: fileId ?? null }).returning({ id: messages.id });
  await createNotification({ recipientId: otherUserId, actorId: userId, type: "message", resourceType: "conversation", resourceId: conversation.id, title: "New message", body: fileId ? "A friend sent you a file." : "A friend sent you a message." });
  return result[0];
}
