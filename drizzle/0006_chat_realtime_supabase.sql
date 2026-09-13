ALTER TABLE messages ADD COLUMN IF NOT EXISTS "deliveredAt" timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "readAt" timestamptz;

CREATE TABLE IF NOT EXISTS chat_presence (
  "userId" integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "lastSeenAt" timestamptz NOT NULL DEFAULT now(),
  "typingConversationId" integer,
  "typingUntil" timestamptz
);

CREATE INDEX IF NOT EXISTS chat_presence_last_seen_idx
  ON chat_presence ("lastSeenAt");
