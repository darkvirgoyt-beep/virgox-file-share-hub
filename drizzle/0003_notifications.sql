CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int AUTO_INCREMENT NOT NULL,
  `recipientId` int NOT NULL,
  `actorId` int,
  `type` varchar(40) NOT NULL,
  `resourceType` varchar(40),
  `resourceId` int,
  `title` varchar(180) NOT NULL,
  `body` text,
  `readAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notifications_recipient_idx` ON `notifications` (`recipientId`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `notifications_unread_idx` ON `notifications` (`recipientId`, `readAt`, `createdAt`);
