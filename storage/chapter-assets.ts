import { env } from "cloudflare:workers";

const BADGE_KEY = "chapter-heraldry";
const COMPANY_SIGIL_PREFIX = "company-heraldry";
const COMPANY_PAULDRON_PREFIX = "company-pauldrons";

export function getChapterAssets() {
  const bucket = env.CHAPTER_ASSETS as R2Bucket | undefined;
  if (!bucket) {
    throw new Error("Chapter asset storage is unavailable.");
  }
  return bucket;
}

export function getBadgeKey() {
  return BADGE_KEY;
}

export function getCompanySigilKey(companyNumber: number) {
  return `${COMPANY_SIGIL_PREFIX}/${companyNumber}`;
}

export function getCompanyPauldronKey(companyNumber: number) {
  return `${COMPANY_PAULDRON_PREFIX}/${companyNumber}`;
}
