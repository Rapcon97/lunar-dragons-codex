import { getArchiveAdmin, isSameOriginRequest } from "../../../../archive-auth";
import {
  parseLoreUpdateBody,
  validateLoreEntryId,
} from "../../../gpt/v1/entries/validation";
import { LORE_COLLECTION_CAPACITY_ERROR } from "../../../../lore-limits";
import { updateAdminLoreEntry } from "../../../../../storage/chapter-records";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await getArchiveAdmin())) {
      return Response.json({ error: "Administrator access is required." }, { status: 403 });
    }
    if (!isSameOriginRequest(request)) {
      return Response.json({ error: "Invalid lore-editing request." }, { status: 403 });
    }
    if (request.headers.get("x-lunar-admin-mode") !== "active") {
      return Response.json({ error: "Enter Admin Mode before editing lore." }, { status: 403 });
    }

    const { id: rawId } = await context.params;
    const id = rawId?.trim() ?? "";
    const idError = validateLoreEntryId(id);
    if (idError) {
      return Response.json({ error: idError }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "A JSON object is required." }, { status: 400 });
    }

    const { expectedUpdatedAt, ...updates } = body as Record<string, unknown>;
    if (
      typeof expectedUpdatedAt !== "number" ||
      !Number.isSafeInteger(expectedUpdatedAt) ||
      expectedUpdatedAt < 0
    ) {
      return Response.json({ error: "The lore revision is invalid." }, { status: 400 });
    }

    const parsed = parseLoreUpdateBody(updates);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    if (parsed.value.status !== undefined) {
      return Response.json(
        { error: "Use the Chronicle status controls to change lore status." },
        { status: 400 },
      );
    }
    if (
      parsed.value.date === undefined ||
      parsed.value.title === undefined ||
      parsed.value.category === undefined ||
      parsed.value.content === undefined
    ) {
      return Response.json(
        { error: "Date, title, category, and content are required for an editor save." },
        { status: 400 },
      );
    }

    const result = await updateAdminLoreEntry(
      id,
      {
        date: parsed.value.date,
        chronology: parsed.value.chronology,
        title: parsed.value.title,
        subtitle: parsed.value.subtitle,
        category: parsed.value.category,
        content: parsed.value.content,
      },
      expectedUpdatedAt,
    );
    if (!result.success) {
      if (result.reason === "capacity") {
        return Response.json({ error: LORE_COLLECTION_CAPACITY_ERROR }, { status: 413 });
      }
      if (result.reason === "not-found") {
        return Response.json({ error: "Lore record not found." }, { status: 404 });
      }
      return Response.json(
        {
          error:
            result.reason === "duplicate"
              ? "That lore record already exists."
              : "The lore record changed before this revision was saved. Reload and review it again.",
        },
        { status: 409 },
      );
    }

    return Response.json(
      { success: true, entry: result.value.entry },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "lore-editor-update-failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ error: "The lore record could not be updated." }, { status: 500 });
  }
}
