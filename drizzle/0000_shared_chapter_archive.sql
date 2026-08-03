CREATE TABLE `chapter_archive` (
	`id` text PRIMARY KEY NOT NULL,
	`identity` text NOT NULL,
	`milestones` text NOT NULL,
	`relics` text NOT NULL,
	`companies` text NOT NULL,
	`entries` text NOT NULL,
	`badge_mode` text DEFAULT 'badge' NOT NULL,
	`updated_at` integer NOT NULL
);
