import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const chapterArchive = sqliteTable("chapter_archive", {
  id: text("id").primaryKey().notNull(),
  identity: text("identity").notNull(),
  milestones: text("milestones").notNull(),
  relics: text("relics").notNull(),
  companies: text("companies").notNull(),
  characters: text("characters").notNull().default("[]"),
  entries: text("entries").notNull(),
  loreEntries: text("lore_entries").notNull().default("[]"),
  voxQuotes: text("vox_quotes").notNull().default("[]"),
  badgeMode: text("badge_mode").notNull().default("badge"),
  relayMessages: text("relay_messages").notNull().default("[]"),
  relayLastGeneratedDate: text("relay_last_generated_date").notNull().default(""),
  sectorIntel: text("sector_intel").notNull().default("{}"),
  loreRevision: integer("lore_revision").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});

export const guestUsers = sqliteTable("guest_users", {
  id: text("id").primaryKey().notNull(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: integer("locked_until"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  lastLoginAt: integer("last_login_at"),
});
