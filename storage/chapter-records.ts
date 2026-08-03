import { env } from "cloudflare:workers";
import {
  CURRENT_LORE_REVISION,
  applyDailyAstropathicMessages,
  applyAuthoritativeLore,
  type ArchiveSection,
  type ChapterArchiveData,
  type LoreEntry,
  createDefaultArchiveData,
  normalizeArchiveData,
  reconcileChronicleEntries,
} from "../app/archive-data";
import {
  applyOptimisticMutation,
  type OptimisticProposal,
  type OptimisticResult,
} from "./optimistic-write";

const ARCHIVE_ID = "lunar-dragons";
const MAX_LORE_WRITE_ATTEMPTS = 3;

type ArchiveRow = {
  identity: string;
  milestones: string;
  relics: string;
  companies: string;
  entries: string;
  lore_entries: string;
  vox_quotes: string;
  badge_mode: string;
  relay_messages: string;
  relay_last_generated_date: string;
  sector_intel: string;
  lore_revision: number;
  updated_at: number;
};

type LoreRow = Pick<
  ArchiveRow,
  "entries" | "lore_entries" | "updated_at"
>;

export type ChapterLoreState = {
  entries: string[];
  loreEntries: LoreEntry[];
  updatedAt: number;
};

function database() {
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) {
    throw new Error("Chapter database is unavailable.");
  }
  return db;
}

export async function ensureChapterArchiveTable() {
  const db = database();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS chapter_archive (
        id TEXT PRIMARY KEY NOT NULL,
        identity TEXT NOT NULL,
        milestones TEXT NOT NULL,
        relics TEXT NOT NULL,
        companies TEXT NOT NULL,
        entries TEXT NOT NULL,
        lore_entries TEXT NOT NULL DEFAULT '[]',
        vox_quotes TEXT NOT NULL DEFAULT '[]',
        badge_mode TEXT NOT NULL DEFAULT 'badge',
        relay_messages TEXT NOT NULL DEFAULT '[]',
        relay_last_generated_date TEXT NOT NULL DEFAULT '',
        sector_intel TEXT NOT NULL DEFAULT '{}',
        lore_revision INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      )`,
    )
    .run();

  const columns = await db
    .prepare("PRAGMA table_info(chapter_archive)")
    .all<{ name: string }>();
  const columnNames = new Set(columns.results.map((column) => column.name));

  // Sites applies packaged Drizzle migrations during deployment. These
  // idempotent guards remain for older databases whose schema was advanced by
  // application releases before the migration history was complete.
  if (!columnNames.has("lore_entries")) {
    await db
      .prepare(
        "ALTER TABLE chapter_archive ADD COLUMN lore_entries TEXT NOT NULL DEFAULT '[]'",
      )
      .run();
  }
  if (!columnNames.has("sector_intel")) {
    await db
      .prepare(
        "ALTER TABLE chapter_archive ADD COLUMN sector_intel TEXT NOT NULL DEFAULT '{}'",
      )
      .run();
  }
  if (!columnNames.has("lore_revision")) {
    await db
      .prepare(
        "ALTER TABLE chapter_archive ADD COLUMN lore_revision INTEGER NOT NULL DEFAULT 0",
      )
      .run();
  }
  if (!columnNames.has("relay_messages")) {
    await db
      .prepare(
        "ALTER TABLE chapter_archive ADD COLUMN relay_messages TEXT NOT NULL DEFAULT '[]'",
      )
      .run();
  }
  if (!columnNames.has("relay_last_generated_date")) {
    await db
      .prepare(
        "ALTER TABLE chapter_archive ADD COLUMN relay_last_generated_date TEXT NOT NULL DEFAULT ''",
      )
      .run();
  }
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function normalizedLoreState(row: LoreRow): ChapterLoreState {
  const archive = normalizeArchiveData({
    entries: parseJson(row.entries),
    loreEntries: parseJson(row.lore_entries),
  });

  return {
    entries: archive.entries,
    loreEntries: archive.loreEntries,
    updatedAt: Number(row.updated_at) || 0,
  };
}

function needsLoreBackfill(row: LoreRow, state: ChapterLoreState) {
  const stored = parseJson(row.lore_entries);
  return (
    (!Array.isArray(stored) || stored.length === 0) &&
    state.loreEntries.length > 0
  );
}

function nextRevision(current: number) {
  return Math.max(Date.now(), current + 1);
}

async function backfillLoreEntries(
  row: LoreRow,
  state: ChapterLoreState,
) {
  const updatedAt = nextRevision(state.updatedAt);
  const result = await database()
    .prepare(
      `UPDATE chapter_archive
       SET lore_entries = ?, updated_at = ?
       WHERE id = ? AND updated_at = ?`,
    )
    .bind(
      JSON.stringify(state.loreEntries),
      updatedAt,
      ARCHIVE_ID,
      state.updatedAt,
    )
    .run();

  return Number(result.meta?.changes ?? 0) === 1
    ? { ...state, updatedAt }
    : null;
}

async function readChapterLoreState(): Promise<ChapterLoreState> {
  await ensureChapterArchiveTable();

  for (let attempt = 0; attempt < MAX_LORE_WRITE_ATTEMPTS; attempt += 1) {
    const row = await database()
      .prepare(
        `SELECT entries, lore_entries, updated_at
         FROM chapter_archive
         WHERE id = ?`,
      )
      .bind(ARCHIVE_ID)
      .first<LoreRow>();

    if (!row) {
      await writeChapterArchive(createDefaultArchiveData());
      continue;
    }

    const state = normalizedLoreState(row);
    if (!needsLoreBackfill(row, state)) {
      return state;
    }

    const backfilled = await backfillLoreEntries(row, state);
    if (backfilled) {
      return backfilled;
    }
  }

  const row = await database()
    .prepare(
      `SELECT entries, lore_entries, updated_at
       FROM chapter_archive
       WHERE id = ?`,
    )
    .bind(ARCHIVE_ID)
    .first<LoreRow>();

  if (!row) {
    throw new Error("Chapter lore record is unavailable.");
  }

  return normalizedLoreState(row);
}

async function commitChapterLoreState(
  current: ChapterLoreState,
  next: ChapterLoreState,
) {
  const updatedAt = nextRevision(current.updatedAt);
  const result = await database()
    .prepare(
      `UPDATE chapter_archive
       SET entries = ?, lore_entries = ?, updated_at = ?
       WHERE id = ? AND updated_at = ?`,
    )
    .bind(
      JSON.stringify(next.entries),
      JSON.stringify(next.loreEntries),
      updatedAt,
      ARCHIVE_ID,
      current.updatedAt,
    )
    .run();

  return Number(result.meta?.changes ?? 0) === 1;
}

/**
 * The only storage mutation available to GPT lore writers. It can update the
 * structured lore, its legacy compatibility mirror, and the archive revision
 * timestamp—nothing else in chapter_archive.
 */
export function mutateChapterLore<Value, Reason extends string>(
  propose: (
    current: ChapterLoreState,
  ) => OptimisticProposal<ChapterLoreState, Value, Reason>,
): Promise<OptimisticResult<Value, Reason>> {
  return applyOptimisticMutation({
    load: readChapterLoreState,
    propose,
    commit: commitChapterLoreState,
    maxAttempts: MAX_LORE_WRITE_ATTEMPTS,
  });
}

export async function readChapterArchive(): Promise<ChapterArchiveData | null> {
  await ensureChapterArchiveTable();

  const row = await database()
    .prepare(
      `SELECT
        identity,
        milestones,
        relics,
        companies,
        entries,
        lore_entries,
        vox_quotes,
        badge_mode,
        relay_messages,
        relay_last_generated_date,
        sector_intel,
        lore_revision,
        updated_at
       FROM chapter_archive
       WHERE id = ?`,
    )
    .bind(ARCHIVE_ID)
    .first<ArchiveRow>();

  if (!row) {
    return writeChapterArchive(createDefaultArchiveData());
  }

  const archive = normalizeArchiveData({
    identity: parseJson(row.identity),
    milestones: parseJson(row.milestones),
    relics: parseJson(row.relics),
    companies: parseJson(row.companies),
    entries: parseJson(row.entries),
    loreEntries: parseJson(row.lore_entries),
    voxQuotes: parseJson(row.vox_quotes),
    badgeMode: row.badge_mode,
    relayMessages: parseJson(row.relay_messages),
    relayLastGeneratedDate: row.relay_last_generated_date,
    sectorIntel: parseJson(row.sector_intel),
  });

  const loreState = normalizedLoreState(row);
  if (needsLoreBackfill(row, loreState)) {
    await backfillLoreEntries(row, loreState);
  }

  if (Number(row.lore_revision || 0) < CURRENT_LORE_REVISION) {
    const authoritative = applyAuthoritativeLore(archive);
    return writeChapterArchive(authoritative);
  }

  const dailyRelay = applyDailyAstropathicMessages(archive);
  if (!dailyRelay.changed) {
    return archive;
  }

  await database()
    .prepare(
      `UPDATE chapter_archive
       SET relay_messages = ?, relay_last_generated_date = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      JSON.stringify(dailyRelay.archive.relayMessages),
      dailyRelay.archive.relayLastGeneratedDate,
      nextRevision(row.updated_at),
      ARCHIVE_ID,
    )
    .run();

  return dailyRelay.archive;
}

export async function writeChapterArchive(value: unknown) {
  await ensureChapterArchiveTable();
  const archive = normalizeArchiveData(value);

  await database()
    .prepare(
      `INSERT INTO chapter_archive
        (
          id,
          identity,
          milestones,
          relics,
          companies,
          entries,
          lore_entries,
          vox_quotes,
          badge_mode,
          relay_messages,
          relay_last_generated_date,
          sector_intel,
          lore_revision,
          updated_at
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        identity = excluded.identity,
        milestones = excluded.milestones,
        relics = excluded.relics,
        companies = excluded.companies,
        entries = excluded.entries,
        lore_entries = excluded.lore_entries,
        vox_quotes = excluded.vox_quotes,
        badge_mode = excluded.badge_mode,
        relay_messages = excluded.relay_messages,
        relay_last_generated_date = excluded.relay_last_generated_date,
        sector_intel = excluded.sector_intel,
        lore_revision = excluded.lore_revision,
        updated_at = excluded.updated_at`,
    )
    .bind(
      ARCHIVE_ID,
      JSON.stringify(archive.identity),
      JSON.stringify(archive.milestones),
      JSON.stringify(archive.relics),
      JSON.stringify(archive.companies),
      JSON.stringify(archive.entries),
      JSON.stringify(archive.loreEntries),
      JSON.stringify(archive.voxQuotes),
      archive.badgeMode,
      JSON.stringify(archive.relayMessages),
      archive.relayLastGeneratedDate,
      JSON.stringify(archive.sectorIntel),
      CURRENT_LORE_REVISION,
      Date.now(),
    )
    .run();

  return archive;
}

const sectionColumns: Record<ArchiveSection, string> = {
  identity: "identity",
  milestones: "milestones",
  relics: "relics",
  companies: "companies",
  entries: "entries",
  loreEntries: "lore_entries",
  voxQuotes: "vox_quotes",
  badgeMode: "badge_mode",
  relayMessages: "relay_messages",
  relayLastGeneratedDate: "relay_last_generated_date",
  sectorIntel: "sector_intel",
};

export async function writeChapterArchiveSection(
  section: ArchiveSection,
  value: unknown,
) {
  await ensureChapterArchiveTable();
  const existing = (await readChapterArchive()) ?? createDefaultArchiveData();
  const archive = normalizeArchiveData({ ...existing, [section]: value });

  if (section === "entries") {
    archive.loreEntries = reconcileChronicleEntries(
      archive.entries,
      existing.loreEntries,
    );
    await database()
      .prepare(
        `UPDATE chapter_archive
         SET entries = ?, lore_entries = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        JSON.stringify(archive.entries),
        JSON.stringify(archive.loreEntries),
        Date.now(),
        ARCHIVE_ID,
      )
      .run();
    return archive;
  }

  const column = sectionColumns[section];
  const storedValue =
    section === "badgeMode"
      ? archive.badgeMode
      : section === "relayLastGeneratedDate"
        ? archive.relayLastGeneratedDate
        : JSON.stringify(archive[section]);

  await database()
    .prepare(
      `UPDATE chapter_archive SET ${column} = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(storedValue, Date.now(), ARCHIVE_ID)
    .run();

  return archive;
}

export async function resetChapterArchive() {
  return writeChapterArchive(createDefaultArchiveData());
}
