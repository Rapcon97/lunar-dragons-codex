ALTER TABLE `chapter_archive` ADD `relay_messages` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `chapter_archive` ADD `relay_last_generated_date` text DEFAULT '' NOT NULL;
