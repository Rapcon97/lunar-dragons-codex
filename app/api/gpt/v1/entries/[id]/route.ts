import {
  getGPTLoreEntryById,
  updateGPTLoreEntry,
} from "../../../../../gpt-api-adapter";
import { requireGPTApiKey } from "../../../../../gpt-api-auth";
import {
  parseLoreUpdateBody,
  validateLoreEntryId,
} from "../validation";
import { LORE_COLLECTION_CAPACITY_ERROR } from "../../../../../lore-limits";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResponse = requireGPTApiKey(request);
  if (authResponse) return authResponse;

  try {
    const { id } = await context.params;
    const idError = validateLoreEntryId(id ?? "");
    if (idError) {
      return Response.json({ error: idError }, { status: 400 });
    }

    const result = await getGPTLoreEntryById(id.trim());
    if (!result.success) {
      return Response.json(
        { error: "Lore entry not found." },
        { status: 404 },
      );
    }

    return Response.json(
      {
        source: result.source,
        persisted: result.persisted,
        entry: result.entry,
      },
      {
        headers: {
          "cache-control": "no-store",
          "content-type": "application/json; charset=utf-8",
        },
      },
    );
  } catch (error) {
    console.error("GPT lore entry read error:", error);
    return Response.json(
      { error: "The lore entry could not be retrieved." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResponse = requireGPTApiKey(request);
  if (authResponse) return authResponse;

  try {
    const { id } = await context.params;
    const idError = validateLoreEntryId(id ?? "");
    if (idError) {
      return Response.json({ error: idError }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "The request body must be valid JSON." },
        { status: 400 },
      );
    }

    const parsed = parseLoreUpdateBody(body);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const result = await updateGPTLoreEntry(id.trim(), parsed.value);
    if (!result.success && result.reason === "capacity") {
      return Response.json(
        { error: LORE_COLLECTION_CAPACITY_ERROR },
        { status: 413 },
      );
    }
    if (!result.success && result.reason === "not-found") {
      return Response.json(
        { error: "Lore entry not found." },
        { status: 404 },
      );
    }
    if (!result.success) {
      const error =
        result.reason === "duplicate"
          ? "That lore entry already exists."
          : "The archive changed while the lore entry was being updated. Retry the request.";
      return Response.json({ error }, { status: 409 });
    }

    return Response.json(
      { success: true, entry: result.entry },
      {
        headers: {
          "cache-control": "no-store",
          "content-type": "application/json; charset=utf-8",
        },
      },
    );
  } catch (error) {
    console.error("GPT lore entry update error:", error);
    return Response.json(
      { error: "The lore entry could not be updated." },
      { status: 500 },
    );
  }
}
