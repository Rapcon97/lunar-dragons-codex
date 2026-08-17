import { getArchiveAdmin, isSameOriginRequest } from "../../../archive-auth";
import { parseLoreCreateBody } from "../../gpt/v1/entries/validation";
import { LORE_COLLECTION_CAPACITY_ERROR } from "../../../lore-limits";
import { createAdminLoreDraft } from "../../../../storage/chapter-records";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!(await getArchiveAdmin())) {
      return Response.json({ error: "Administrator access is required." }, { status: 403 });
    }
    if (!isSameOriginRequest(request)) {
      return Response.json({ error: "Invalid lore-editing request." }, { status: 403 });
    }
    if (request.headers.get("x-lunar-admin-mode") !== "active") {
      return Response.json({ error: "Enter Admin Mode before creating lore." }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
    }

    const parsed = parseLoreCreateBody(body);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    if (parsed.value.status !== "draft") {
      return Response.json(
        { error: "New on-site lore must begin as a draft." },
        { status: 400 },
      );
    }

    const result = await createAdminLoreDraft({
      date: parsed.value.date ?? "",
      chronology: parsed.value.chronology,
      title: parsed.value.title ?? "Untitled archival record",
      subtitle: parsed.value.subtitle,
      category: parsed.value.category ?? "event",
      content: parsed.value.content,
    });
    if (!result.success) {
      if (result.reason === "invalid-chronology") {
        return Response.json(
          { error: "Select a valid structured Imperial date." },
          { status: 400 },
        );
      }
      if (result.reason === "capacity") {
        return Response.json({ error: LORE_COLLECTION_CAPACITY_ERROR }, { status: 413 });
      }
      return Response.json(
        {
          error:
            result.reason === "duplicate"
              ? "That lore record already exists."
              : "The archive changed while the draft was being created. Retry the request.",
        },
        { status: 409 },
      );
    }

    return Response.json(
      { success: true, entry: result.value.entry, count: result.value.count },
      { status: 201, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "lore-draft-creation-failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ error: "The lore draft could not be created." }, { status: 500 });
  }
}
