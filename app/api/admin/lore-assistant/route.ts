import { env } from "cloudflare:workers";
import { getArchiveAdmin, isSameOriginRequest } from "../../../archive-auth";
import {
  buildLoreAssistantOpenAIRequest,
  loreAssistantSafetyIdentifier,
  parseLoreAssistantAnswer,
  parseLoreAssistantRequest,
  selectCanonLoreContext,
} from "../../../lore-assistant";
import { readChapterArchive } from "../../../../storage/chapter-records";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await getArchiveAdmin();
  if (!admin) {
    return Response.json({ error: "Administrator access is required." }, { status: 403 });
  }
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid lore consultation request." }, { status: 403 });
  }
  if (request.headers.get("x-lunar-admin-mode") !== "active") {
    return Response.json({ error: "Enter Admin Mode before consulting the Lore Cogitator." }, { status: 403 });
  }

  const apiKey = (env as { OPENAI_API_KEY?: string }).OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "The Lore Cogitator is not configured. OPENAI_API_KEY is required." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  const parsed = parseLoreAssistantRequest(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const archive = await readChapterArchive();
    if (!archive) {
      return Response.json({ error: "The authoritative lore archive is unavailable." }, { status: 503 });
    }
    const safetyIdentifier = await loreAssistantSafetyIdentifier(admin.email);
    const openAIRequest = buildLoreAssistantOpenAIRequest(
      parsed.value,
      archive.loreEntries,
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
      console.error("lore-cogitator-openai-failed", {
        status: response.status,
        requestId: response.headers.get("x-request-id"),
      });
      return Response.json(
        { error: "The Lore Cogitator could not complete the consultation." },
        { status: 502 },
      );
    }

    const rawResponse = await response.json();
    const canon = selectCanonLoreContext(archive.loreEntries, parsed.value);
    const answer = parseLoreAssistantAnswer(rawResponse, canon.canonIds);
    if (!answer) {
      return Response.json(
        { error: "The Lore Cogitator returned an unreadable consultation." },
        { status: 502 },
      );
    }

    return Response.json(answer, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error(
      "lore-cogitator-failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      { error: "The Lore Cogitator is temporarily unavailable." },
      { status: 503 },
    );
  }
}
