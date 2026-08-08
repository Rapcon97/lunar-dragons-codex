import {
  appendGPTLoreEntry,
  getGPTLoreEntries,
} from "../../../../gpt-api-adapter";
import { requireGPTApiKey } from "../../../../gpt-api-auth";
import { parseLoreCreateBody } from "./validation";
import { LORE_COLLECTION_CAPACITY_ERROR } from "../../../../lore-limits";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authResponse = requireGPTApiKey(request);
  if (authResponse) return authResponse;

  try {
    const url = new URL(request.url);
    const offsetValue = url.searchParams.get("offset");
    const limitValue = url.searchParams.get("limit");
    const includeContentValue = url.searchParams.get("includeContent");
    const offset = offsetValue === null ? 0 : Number(offsetValue);
    const limit = limitValue === null ? 20 : Number(limitValue);

    if (!Number.isSafeInteger(offset) || offset < 0) {
      return Response.json(
        { error: "The entry offset must be a non-negative integer." },
        { status: 400 },
      );
    }
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      return Response.json(
        { error: "The entry limit must be an integer from 1 to 50." },
        { status: 400 },
      );
    }
    if (
      includeContentValue !== null &&
      includeContentValue !== "true" &&
      includeContentValue !== "false"
    ) {
      return Response.json(
        { error: "includeContent must be true or false." },
        { status: 400 },
      );
    }

    const includeContent = includeContentValue === "true";
    if (includeContent && limit !== 1) {
      return Response.json(
        {
          error:
            "Full-content listing is limited to one record. Use limit=1 or retrieve a record by ID.",
        },
        { status: 400 },
      );
    }

    const lore = await getGPTLoreEntries({ offset, limit, includeContent });
    return Response.json(lore, {
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("GPT lore entries API error:", error);
    return Response.json(
      { error: "The Lunar Dragons lore entries are unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const authResponse = requireGPTApiKey(request);
  if (authResponse) return authResponse;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "The request body must be valid JSON." },
        { status: 400 },
      );
    }

    const parsed = parseLoreCreateBody(body);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const result = await appendGPTLoreEntry(parsed.value);
    if (!result.success && result.reason === "capacity") {
      return Response.json(
        { error: LORE_COLLECTION_CAPACITY_ERROR },
        { status: 413 },
      );
    }
    if (!result.success) {
      const error =
        result.reason === "duplicate"
          ? "That lore entry already exists."
          : "The archive changed while the lore entry was being added. Retry the request.";
      return Response.json({ error }, { status: 409 });
    }

    return Response.json(
      { success: true, entry: result.entry, count: result.count },
      {
        status: 201,
        headers: {
          "cache-control": "no-store",
          "content-type": "application/json; charset=utf-8",
        },
      },
    );
  } catch (error) {
    console.error("GPT lore entry write error:", error);
    return Response.json(
      { error: "The lore entry could not be added." },
      { status: 500 },
    );
  }
}
