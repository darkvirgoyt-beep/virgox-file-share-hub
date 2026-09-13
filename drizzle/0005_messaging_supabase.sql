CREATE TABLE IF NOT EXISTS conversations (
  id serial PRIMARY KEY,
  "userAId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "userBId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversation_pair UNIQUE ("userAId", "userBId")
);

CREATE TABLE IF NOT EXISTS stored_files (
  id serial PRIMARY KEY,
  "ownerId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "groupId" integer,
  "originalName" varchar(255) NOT NULL,
  "storageKey" text NOT NULL,
  "mimeType" varchar(120) NOT NULL,
  "sizeBytes" integer NOT NULL,
  "scanStatus" varchar(64) NOT NULL DEFAULT 'pending',
  visibility varchar(64) NOT NULL DEFAULT 'private',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  "conversationId" integer NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  "senderId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text,
  "fileId" integer,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages ("conversationId", "createdAt");
