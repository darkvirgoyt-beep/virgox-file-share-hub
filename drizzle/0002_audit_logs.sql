CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `actorId` int,
  `action` varchar(80) NOT NULL,
  `resourceType` varchar(80),
  `resourceId` int,
  `requestId` varchar(80),
  `ipAddress` varchar(64),
  `metadata` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `audit_logs_actor_created_idx` ON `audit_logs` (`actorId`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `audit_logs_resource_idx` ON `audit_logs` (`resourceType`, `resourceId`, `createdAt`);
