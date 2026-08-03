CREATE TABLE `guest_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`last_login_at` integer,
	CONSTRAINT `guest_users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `guest_users_active_idx` ON `guest_users` (`is_active`,`username`);
