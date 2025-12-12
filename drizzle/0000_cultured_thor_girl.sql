CREATE TABLE `key_value_store` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`storeName` text,
	`createdAt` integer
);
--> statement-breakpoint
CREATE TABLE `session_store` (
	`id` text PRIMARY KEY NOT NULL,
	`did` text NOT NULL,
	`handle` text NOT NULL,
	`createdAt` integer NOT NULL,
	`expiresAt` integer NOT NULL
);
