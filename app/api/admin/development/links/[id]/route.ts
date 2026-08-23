import { getArchiveAdmin, isSameOriginRequest } from "../../../../../archive-auth";
import { normalizeDevelopmentTopicIds } from "../../../../../development-links";
import { updateAdminLoreDevelopmentTopics } from "../../../../../../storage/chapter-records";

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
      return Response.json({ error: "Invalid development-link request." }, { status: 403 });
    }
    if (request.headers.get("x-lunar-admin-mode") !== "active") {
      return Response.json({ error: "Enter Admin Mode before linking lore." }, { status: 403 });
    }

    const { id: rawId } = await context.params;
    const id = rawId?.trim() ?? "";
    if (!id || id.length > 160) {
      return Response.json({ error: "The lore record ID is invalid." }, { status: 400 });
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
    const record = body as Record<string, unknown>;
    if (Object.keys(record).some((key) => !["developmentTopicIds", "expectedUpdatedAt"].includes(key))) {
      return Response.json({ error: "The development-link update contains an unknown field." }, { status: 400 });
    }
    const developmentTopicIds = normalizeDevelopmentTopicIds(record.developmentTopicIds);
    if (!developmentTopicIds) {
      return Response.json({ error: "Select only controlled development topics." }, { status: 400 });
    }
    if (
      typeof record.expectedUpdatedAt !== "number" ||
      !Number.isSafeInteger(record.expectedUpdatedAt) ||
      record.expectedUpdatedAt < 0
    ) {
      return Response.json({ error: "The lore revision is invalid." }, { status: 400 });
    }

    const result = await updateAdminLoreDevelopmentTopics(
      id,
      developmentTopicIds,
      record.expectedUpdatedAt,
    );
    if (!result.success) {
      if (result.reason === "not-found") {
        return Response.json({ error: "Lore record not found." }, { status: 404 });
      }
      if (result.reason === "invalid-topics") {
        return Response.json({ error: "Select only controlled development topics." }, { status: 400 });
      }
      return Response.json(
        { error: "The lore record changed before these links were saved. Reload and review it again." },
        { status: 409 },
      );
    }

    return Response.json(
      { success: true, entry: result.value.entry },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("development-link-update-failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "The development links could not be updated." }, { status: 500 });
  }
}
