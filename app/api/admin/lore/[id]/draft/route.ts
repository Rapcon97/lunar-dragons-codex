import { getArchiveAdmin, isSameOriginRequest } from "../../../../../archive-auth";
import { returnCanonLoreEntryToDraft } from "../../../../../../storage/chapter-records";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await getArchiveAdmin())) {
      return Response.json({ error: "Administrator access is required." }, { status: 403 });
    }
    if (!isSameOriginRequest(request)) {
      return Response.json({ error: "Invalid draft-return request." }, { status: 403 });
    }
    if (request.headers.get("x-lunar-admin-mode") !== "active") {
      return Response.json({ error: "Enter Admin Mode before changing canon lore." }, { status: 403 });
    }

    const { id: rawId } = await context.params;
    const id = rawId?.trim() ?? "";
    if (!id || id.length > 160) {
      return Response.json({ error: "Choose a valid lore record." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
    }
    const expectedUpdatedAt =
      typeof body === "object" && body !== null
        ? (body as { expectedUpdatedAt?: unknown }).expectedUpdatedAt
        : undefined;
    if (
      typeof expectedUpdatedAt !== "number" ||
      !Number.isSafeInteger(expectedUpdatedAt) ||
      expectedUpdatedAt < 0
    ) {
      return Response.json({ error: "The lore revision is invalid." }, { status: 400 });
    }

    const result = await returnCanonLoreEntryToDraft(id, expectedUpdatedAt);
    if (!result.success) {
      if (result.reason === "not-found") {
        return Response.json({ error: "Lore record not found." }, { status: 404 });
      }
      if (result.reason === "not-canon") {
        return Response.json({ error: "Only canon records may be returned to draft." }, { status: 409 });
      }
      return Response.json(
        { error: "The lore record changed before it could be returned to draft. Reload and review it again." },
        { status: 409 },
      );
    }

    return Response.json(
      { success: true, entry: result.value.entry },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "lore-draft-return-failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ error: "The lore record could not be returned to draft." }, { status: 500 });
  }
}
