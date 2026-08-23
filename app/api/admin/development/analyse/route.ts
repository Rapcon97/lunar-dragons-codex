import { env } from "cloudflare:workers";
import { getArchiveAdmin, isSameOriginRequest } from "../../../../archive-auth";
import {
  buildDevelopmentAssistantOpenAIRequest,
  parseDevelopmentAssistantAnswer,
  parseDevelopmentAssistantRequest,
} from "../../../../development-assistant";
import { loreAssistantSafetyIdentifier } from "../../../../lore-assistant";
import { readChapterArchive } from "../../../../../storage/chapter-records";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await getArchiveAdmin();
  if (!admin) {
    return Response.json({ error: "Administrator access is required." }, { status: 403 });
  }
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid development consultation request." }, { status: 403 });
  }
  if (request.headers.get("x-lunar-admin-mode") !== "active") {
    return Response.json({ error: "Enter Admin Mode before consulting the ledger cogitator." }, { status: 403 });
  }

  const apiKey = (env as { OPENAI_API_KEY?: string }).OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "The ledger cogitator is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  const parsed = parseDevelopmentAssistantRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  try {
    const archive = await readChapterArchive();
    const entry = archive?.loreEntries.find((candidate) => candidate.id === parsed.value.entryId);
    if (!entry) return Response.json({ error: "Lore record not found." }, { status: 404 });
    if (entry.updatedAt !== parsed.value.expectedUpdatedAt) {
      return Response.json({ error: "The lore record changed. Reload it before requesting new links." }, { status: 409 });
    }

    const safetyIdentifier = await loreAssistantSafetyIdentifier(admin.email);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(buildDevelopmentAssistantOpenAIRequest(entry, safetyIdentifier)),
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) {
      console.error("development-cogitator-openai-failed", {
        status: response.status,
        requestId: response.headers.get("x-request-id"),
      });
      return Response.json({ error: "The ledger cogitator could not complete the consultation." }, { status: 502 });
    }
    const answer = parseDevelopmentAssistantAnswer(await response.json());
    if (!answer) {
      return Response.json({ error: "The ledger cogitator returned an unreadable proposal." }, { status: 502 });
    }
    return Response.json(answer, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("development-cogitator-failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "The ledger cogitator is temporarily unavailable." }, { status: 503 });
  }
}
