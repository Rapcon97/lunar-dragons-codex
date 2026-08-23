import type {
  ChapterMilestone,
  LoreEntry,
  LoreStatus,
} from "./archive-data";

export const DEVELOPMENT_TOPIC_MANUAL_STATUSES = [
  "operational-only",
  "intentionally-unresolved",
] as const;

export type DevelopmentTopicManualStatus =
  (typeof DEVELOPMENT_TOPIC_MANUAL_STATUSES)[number];

export type DevelopmentTopicStatus =
  | "undeveloped"
  | "in-development"
  | "review"
  | "established"
  | "previously-covered"
  | DevelopmentTopicManualStatus;

export const DEVELOPMENT_TOPIC_STATUSES: ReadonlyArray<DevelopmentTopicStatus> = [
  "undeveloped",
  "in-development",
  "review",
  "established",
  "previously-covered",
  ...DEVELOPMENT_TOPIC_MANUAL_STATUSES,
];

export type DevelopmentDomain =
  | "identity"
  | "culture"
  | "organisation"
  | "warfare"
  | "institutions";

export type DevelopmentTopic = {
  id: string;
  domain: DevelopmentDomain;
  label: string;
  prompt: string;
};

export const DEVELOPMENT_DOMAINS: ReadonlyArray<{
  id: DevelopmentDomain;
  label: string;
  description: string;
}> = [
  {
    id: "identity",
    label: "Chapter Information",
    description: "Identity, origin, domain, heraldry, and defining characteristics.",
  },
  {
    id: "culture",
    label: "Chapter Culture",
    description: "Beliefs, relationships, recruitment, traditions, and enemies.",
  },
  {
    id: "organisation",
    label: "Chapter Organisation",
    description: "Authority, specialist ranks, companies, and current strength.",
  },
  {
    id: "warfare",
    label: "Warfare and Strategy",
    description: "Doctrine, strategic strengths, deployments, and order of battle.",
  },
  {
    id: "institutions",
    label: "Chapter Institutions",
    description: "Librarius, Reclusiam, Armoury, fleet, and Apothecarion.",
  },
];

export const DEVELOPMENT_TOPICS: ReadonlyArray<DevelopmentTopic> = [
  { id: "chapter-designation", domain: "identity", label: "Chapter designation and niche", prompt: "Establish the Chapter name, distinctive role, and the qualities that separate it from other Adeptus Astartes Chapters." },
  { id: "founding-lineage", domain: "identity", label: "Founding and gene-line", prompt: "Record the Founding, date of creation, gene-line, progenitor relationship, and any known successors." },
  { id: "founding-purpose", domain: "identity", label: "Founding purpose and mandate", prompt: "Explain why the Chapter was raised and the strategic duty entrusted to it." },
  { id: "homeworld-domain", domain: "identity", label: "Homeworld and domain", prompt: "Define the Chapter's homeworld or fleet-based domain, its status, population, relationship, and location." },
  { id: "fortress-monastery", domain: "identity", label: "Fortress-monastery", prompt: "Describe the Chapter's principal fortress, vessel, or sanctuary, including its location and distinctive chambers." },
  { id: "chapter-master-motto", domain: "identity", label: "Chapter Master, motto, and war cry", prompt: "Identify the Chapter Master and establish the Chapter's motto, war cry, and defining self-description." },
  { id: "heraldry-colours", domain: "identity", label: "Heraldry and colours", prompt: "Define the Chapter sigil, armour colours, helmet and shoulder markings, weapon colours, and their symbolic meaning." },
  { id: "human-relations", domain: "culture", label: "Relations with humanity", prompt: "Establish the Chapter's treatment of ordinary humans, psykers, abhumans, serfs, and equerries." },
  { id: "imperial-relations", domain: "culture", label: "Relations with Imperial institutions", prompt: "Record significant relationships with other Chapters, the Ecclesiarchy, Mechanicus, Inquisition, Navy, Guard, and other Imperial bodies." },
  { id: "enemies-rivals", domain: "culture", label: "Hated foes and rivals", prompt: "Identify enduring enemies, rivalries, and the events that made them significant to the Chapter." },
  { id: "recruitment", domain: "culture", label: "Recruitment and neophytes", prompt: "Define recruitment locations, aspirant trials, treatment of failures, later trials, and the role of neophytes." },
  { id: "beliefs-traditions", domain: "culture", label: "Beliefs, death, and traditions", prompt: "Describe the Chapter's view of death, remembrance, rituals, customs, superstitions, and codes of conduct." },
  { id: "command-structure", domain: "organisation", label: "Command structure", prompt: "Define advancement, command ranks, Masters of the Chapter, and any unique councils or offices." },
  { id: "specialist-ranks", domain: "organisation", label: "Specialist ranks", prompt: "Define the Chapter's Librarians, Techmarines, Chaplains, Apothecaries, Champions, Ancients, honour guard, and unique specialists." },
  { id: "company-organisation", domain: "organisation", label: "Companies and force composition", prompt: "Describe each company, its role, strength, squad composition, reserves, veterans, scouts, and divergences from the Codex Astartes." },
  { id: "current-strength", domain: "organisation", label: "Current strength and order of battle", prompt: "Maintain the current Chapter roll, commanders, companies, specialists, vehicles, losses, and operational readiness." },
  { id: "chapter-command", domain: "organisation", label: "Chapter command and political authority", prompt: "Describe Chapter Command, its halls and offices, decision-making, political influence, and senior champions." },
  { id: "combat-doctrine", domain: "warfare", label: "Combat doctrine", prompt: "Establish preferred operational methods, battlefield doctrine, deployment patterns, and the Chapter's attitude to war." },
  { id: "strategic-strengths", domain: "warfare", label: "Strategic strengths and limitations", prompt: "Record specialisations, advantages, weaknesses, logistical constraints, and situations the Chapter is poorly suited to face." },
  { id: "campaign-history", domain: "warfare", label: "Campaign history", prompt: "Develop the Chapter's major campaigns, battles, oaths, losses, honours, and the events that shaped its identity." },
  { id: "librarius", domain: "institutions", label: "Librarius", prompt: "Define the Chief Librarian, psychic traditions, archives, legendary figures, artefacts, and Chapter history held by the Librarius." },
  { id: "reclusiam", domain: "institutions", label: "Reclusiam", prompt: "Define the Master of Sanctity, prayers, oaths, relic cults, spiritual practices, and duties of the Chaplains." },
  { id: "armoury-wargear", domain: "institutions", label: "Armoury and wargear", prompt: "Catalogue relic wargear, Chapter-specific equipment, servitors, weapons, vehicles, production capacity, and machine traditions." },
  { id: "fleet", domain: "institutions", label: "Fleet and void assets", prompt: "Describe the Chapter fleet, important vessels, shipboard facilities, commanders, deployment capacity, and operational state." },
  { id: "apothecarion-geneseed", domain: "institutions", label: "Apothecarion and gene-seed", prompt: "Define the Chief Apothecary, gene-seed provenance and reserves, implant function, mutations, biological concerns, and specialist compounds." },
  { id: "relics-legacy", domain: "institutions", label: "Relics and legacy", prompt: "Record holy, psychic, technological, and martial relics together with their provenance, custodianship, and meaning." },
];

const TOPICS_BY_ID = new Map(DEVELOPMENT_TOPICS.map((topic) => [topic.id, topic]));

export function normalizeDevelopmentTopicId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getDevelopmentTopic(id: string) {
  return TOPICS_BY_ID.get(normalizeDevelopmentTopicId(id));
}

export function isDevelopmentTopicId(id: string) {
  return Boolean(getDevelopmentTopic(id));
}

export function developmentTopicOverride(
  topicId: string,
  milestones: ChapterMilestone[],
) {
  return milestones.find((milestone) => milestone.topicId === topicId);
}

const statusPriority: Record<LoreStatus, number> = {
  canon: 4,
  review: 3,
  draft: 2,
  retconned: 1,
};

export function linkedLoreEntries(topicId: string, loreEntries: LoreEntry[]) {
  return loreEntries
    .filter((entry) => entry.developmentTopicIds?.includes(topicId))
    .sort(
      (left, right) =>
        statusPriority[right.status] - statusPriority[left.status] ||
        right.updatedAt - left.updatedAt,
    );
}

export function deriveDevelopmentTopicStatus(
  topicId: string,
  loreEntries: LoreEntry[],
  milestones: ChapterMilestone[] = [],
): DevelopmentTopicStatus {
  const manualStatus = developmentTopicOverride(topicId, milestones)?.manualStatus;
  if (manualStatus && DEVELOPMENT_TOPIC_MANUAL_STATUSES.includes(manualStatus)) {
    return manualStatus;
  }

  const statuses = new Set(
    linkedLoreEntries(topicId, loreEntries).map((entry) => entry.status),
  );
  if (statuses.has("canon")) return "established";
  if (statuses.has("review")) return "review";
  if (statuses.has("draft")) return "in-development";
  if (statuses.has("retconned")) return "previously-covered";
  return "undeveloped";
}

export function developmentTopicSummaries(
  loreEntries: LoreEntry[],
  milestones: ChapterMilestone[] = [],
) {
  return DEVELOPMENT_TOPICS.map((topic) => {
    const linkedEntries = linkedLoreEntries(topic.id, loreEntries);
    const override = developmentTopicOverride(topic.id, milestones);
    return {
      ...topic,
      status: deriveDevelopmentTopicStatus(topic.id, loreEntries, milestones),
      notes: override?.notes ?? "",
      linkedCount: linkedEntries.length,
      linkedEntries: linkedEntries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        subtitle: entry.subtitle,
        date: entry.date,
        category: entry.category,
        status: entry.status,
        updatedAt: entry.updatedAt,
      })),
    };
  });
}

export function unmappedDevelopmentLore(loreEntries: LoreEntry[]) {
  return loreEntries.filter((entry) => !entry.developmentTopicIds?.length);
}
