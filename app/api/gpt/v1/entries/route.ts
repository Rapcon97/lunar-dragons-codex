import {
  appendGPTLoreEntry,
  getGPTLoreEntries,
} from "../../../../gpt-api-adapter";
import { requireGPTApiKey } from "../../../../gpt-api-auth";
import { parseLoreCreateBody } from "./validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authResponse = requireGPTApiKey(request);
  if (authResponse) return authResponse;

  try {
    const lore = await getGPTLoreEntries();
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
