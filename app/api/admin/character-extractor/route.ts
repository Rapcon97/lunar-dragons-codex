import { env } from "cloudflare:workers";
import { getArchiveAdmin, isSameOriginRequest } from "../../../archive-auth";
import {
  buildCharacterExtractionOpenAIRequest,
  parseCharacterExtractionAnswer,
  parseCharacterExtractionRequest,
  selectCharacterCanonSources,
} from "../../../character-extractor";
import { loreAssistantSafetyIdentifier } from "../../../lore-assistant";
import { readChapterArchive } from "../../../../storage/chapter-records";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await getArchiveAdmin();
  if (!admin) {
    return Response.json({ error: "Administrator access is required." }, { status: 403 });
  }
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid character-extraction request." }, { status: 403 });
  }
  if (request.headers.get("x-lunar-admin-mode") !== "active") {
    return Response.json({ error: "Enter Admin Mode before extracting a character record." }, { status: 403 });
  }

  const apiKey = (env as { OPENAI_API_KEY?: string }).OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Character extraction is not configured. OPENAI_API_KEY is required." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  const parsed = parseCharacterExtractionRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  try {
    const archive = await readChapterArchive();
    if (!archive) {
      return Response.json({ error: "The authoritative lore archive is unavailable." }, { status: 503 });
    }
    const selected = selectCharacterCanonSources(archive.loreEntries, parsed.value.loreEntryIds);
    if (!selected.ok) return Response.json({ error: selected.error }, { status: 400 });

    const safetyIdentifier = await loreAssistantSafetyIdentifier(admin.email);
    const openAIRequest = buildCharacterExtractionOpenAIRequest(
      parsed.value,
      selected.value,
      archive.companies,
      safetyIdentifier,
    );
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(openAIRequest),
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) {
      console.error("character-extractor-openai-failed", {
        status: response.status,
        requestId: response.headers.get("x-request-id"),
      });
      return Response.json({ error: "The Lore Cogitator could not extract a character." }, { status: 502 });
    }
    const answer = parseCharacterExtractionAnswer(await response.json(), archive.companies);
    if (!answer) {
      return Response.json({ error: "The Lore Cogitator returned an unreadable character proposal." }, { status: 502 });
    }
    return Response.json(answer, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error(
      "character-extractor-failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ error: "Character extraction is temporarily unavailable." }, { status: 503 });
  }
}
