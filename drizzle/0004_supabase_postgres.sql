CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  "openId" varchar(64) NOT NULL UNIQUE,
  name text,
  email varchar(320),
  "loginMethod" varchar(64),
  role varchar(64) NOT NULL DEFAULT 'user',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "lastSignedIn" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS profiles (
  id serial PRIMARY KEY,
  "userId" integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  username varchar(32) NOT NULL UNIQUE,
  "displayName" varchar(120) NOT NULL,
  bio text,
  "avatarUrl" text,
  "coverImageUrl" text,
  "followersCount" integer NOT NULL DEFAULT 0,
  "followingCount" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS follows (id serial PRIMARY KEY, "followerId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, "followingId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, "createdAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT follow_pair UNIQUE ("followerId", "followingId"));
CREATE TABLE IF NOT EXISTS groups (id serial PRIMARY KEY, "ownerId" integer NOT NULL REFERENCES users(id), name varchar(120) NOT NULL, slug varchar(140) NOT NULL UNIQUE, description text, visibility varchar(64) NOT NULL DEFAULT 'public', "profileImageUrl" text, "coverImageUrl" text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS group_members (id serial PRIMARY KEY, "groupId" integer NOT NULL REFERENCES groups(id) ON DELETE CASCADE, "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, role varchar(64) NOT NULL DEFAULT 'member', status varchar(64) NOT NULL DEFAULT 'active', "joinedAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT group_user UNIQUE ("groupId", "userId"));
CREATE TABLE IF NOT EXISTS videos (id serial PRIMARY KEY, "creatorId" integer NOT NULL REFERENCES users(id), title varchar(180) NOT NULL, description text, "storageKey" text NOT NULL, "thumbnailKey" text, "durationSeconds" integer NOT NULL, category varchar(80), tags text, hashtags text, visibility varchar(64) NOT NULL DEFAULT 'public', "processingStatus" varchar(64) NOT NULL DEFAULT 'pending', "viewsCount" integer NOT NULL DEFAULT 0, "likesCount" integer NOT NULL DEFAULT 0, "commentsCount" integer NOT NULL DEFAULT 0, "sharesCount" integer NOT NULL DEFAULT 0, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS video_interactions (id serial PRIMARY KEY, "videoId" integer NOT NULL REFERENCES videos(id) ON DELETE CASCADE, "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, type varchar(64) NOT NULL, "watchSeconds" integer NOT NULL DEFAULT 0, completed boolean NOT NULL DEFAULT false, "createdAt" timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS posts (id serial PRIMARY KEY, "authorId" integer NOT NULL REFERENCES users(id), "groupId" integer REFERENCES groups(id), body text NOT NULL, "mediaKey" text, visibility varchar(64) NOT NULL DEFAULT 'public', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS comments (id serial PRIMARY KEY, "videoId" integer REFERENCES videos(id) ON DELETE CASCADE, "postId" integer REFERENCES posts(id) ON DELETE CASCADE, "authorId" integer NOT NULL REFERENCES users(id), body varchar(1000) NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS stored_files (id serial PRIMARY KEY, "ownerId" integer NOT NULL REFERENCES users(id), "groupId" integer REFERENCES groups(id), "originalName" varchar(255) NOT NULL, "storageKey" text NOT NULL, "mimeType" varchar(120) NOT NULL, "sizeBytes" integer NOT NULL, "scanStatus" varchar(64) NOT NULL DEFAULT 'pending', visibility varchar(64) NOT NULL DEFAULT 'private', "createdAt" timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS reports (id serial PRIMARY KEY, "reporterId" integer NOT NULL REFERENCES users(id), "targetType" varchar(64) NOT NULL, "targetId" integer NOT NULL, reason varchar(160) NOT NULL, status varchar(64) NOT NULL DEFAULT 'open', "createdAt" timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS blocks (id serial PRIMARY KEY, "blockerId" integer NOT NULL REFERENCES users(id), "blockedId" integer NOT NULL REFERENCES users(id), "createdAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT block_pair UNIQUE ("blockerId", "blockedId"));
CREATE TABLE IF NOT EXISTS search_history (id serial PRIMARY KEY, "userId" integer NOT NULL REFERENCES users(id), query varchar(160) NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_logs (id serial PRIMARY KEY, "actorId" integer REFERENCES users(id), action varchar(80) NOT NULL, "resourceType" varchar(80), "resourceId" integer, "requestId" varchar(80), "ipAddress" varchar(64), metadata jsonb, "createdAt" timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS notifications (id serial PRIMARY KEY, "recipientId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, "actorId" integer REFERENCES users(id), type varchar(40) NOT NULL, "resourceType" varchar(40), "resourceId" integer, title varchar(180) NOT NULL, body text, "readAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now());
