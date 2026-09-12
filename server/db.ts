import postgres from "postgres";
import { InsertUser, User } from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";

let _sql: ReturnType<typeof postgres> | null = null;
let _dbUnavailable = false;

function getSql() {
  if (_dbUnavailable) return null;
  if (!_sql && ENV.databaseUrl) {
    try {
      _sql = postgres(ENV.databaseUrl, {
        ssl: "require",
        max: 1,
        prepare: false,
        connect_timeout: 10,
      });
    } catch (error) {
      _dbUnavailable = true;
      console.error("[Database] Failed to initialize Supabase Postgres client", error);
    }
  }
  return _sql;
}

function mapUser(row: any): User {
  return {
    id: Number(row.id),
    openId: String(row.openId),
    name: row.name ?? null,
    email: row.email ?? null,
    loginMethod: row.loginMethod ?? null,
    role: row.role === "admin" ? "admin" : "user",
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    lastSignedIn: new Date(row.lastSignedIn),
  } as User;
}

export async function getDb() {
  return getSql();
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const sql = getSql();
  if (!sql) throw new Error("Supabase database is not configured");

  const name = user.name ?? null;
  const email = user.email ?? null;
  const loginMethod = user.loginMethod ?? null;
  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  const lastSignedIn = user.lastSignedIn ?? new Date();

  await sql`
    insert into public.users ("openId", name, email, "loginMethod", role, "createdAt", "updatedAt", "lastSignedIn")
    values (${user.openId}, ${name}, ${email}, ${loginMethod}, ${role}, now(), now(), ${lastSignedIn})
    on conflict ("openId") do update set
      name = coalesce(excluded.name, public.users.name),
      email = coalesce(excluded.email, public.users.email),
      "loginMethod" = coalesce(excluded."loginMethod", public.users."loginMethod"),
      role = excluded.role,
      "updatedAt" = now(),
      "lastSignedIn" = excluded."lastSignedIn"
  `;
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const sql = getSql();
  if (!sql) throw new Error("Supabase database is not configured");
  const rows = await sql`
    select id, "openId", name, email, "loginMethod", role, "createdAt", "updatedAt", "lastSignedIn"
    from public.users where "openId" = ${openId} limit 1
  `;
  return rows[0] ? mapUser(rows[0]) : undefined;
}

export async function getProfileByUserId(userId: number) {
  const sql = getSql();
  if (!sql) throw new Error("Supabase database is not configured");
  const rows = await sql`
    select id, username, "displayName", bio, "avatarUrl", "coverImageUrl", "followersCount", "followingCount"
    from public.profiles where "userId" = ${userId} limit 1
  `;
  return rows[0] ?? undefined;
}

export async function getPublicFeed(_limit = 30) {
  return [];
}

export async function getPublicGroups(_limit = 30) {
  return [];
}

export async function createVideoDraft(_input: any) {
  throw new Error("File/video storage tables are not configured yet");
}

export async function recordVideoView(_input: any) {
  return;
}

export async function createReport(_input: any) {
  throw new Error("Moderation tables are not configured yet");
}
