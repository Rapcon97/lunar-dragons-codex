import type { LoreStatus } from "../../../../../archive-data";
import { getArchiveAdmin, isSameOriginRequest } from "../../../../../archive-auth";
import { updateLoreEntryStatus } from "../../../../../../storage/chapter-records";

export const dynamic = "force-dynamic";

const validStatuses = new Set<LoreStatus>([
  "draft",
  "review",
  "canon",
  "retconned",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await getArchiveAdmin())) {
      return Response.json({ error: "Administrator access is required." }, { status: 403 });
    }
    if (!isSameOriginRequest(request)) {
      return Response.json({ error: "Invalid lore-status request." }, { status: 403 });
    }
    if (request.headers.get("x-lunar-admin-mode") !== "active") {
      return Response.json({ error: "Enter Admin Mode before changing lore status." }, { status: 403 });
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
    const payload = typeof body === "object" && body !== null
      ? body as { targetStatus?: unknown; expectedUpdatedAt?: unknown }
      : {};
    if (
      typeof payload.targetStatus !== "string" ||
      !validStatuses.has(payload.targetStatus as LoreStatus)
    ) {
      return Response.json({ error: "Choose a valid lore status." }, { status: 400 });
    }
    if (
      typeof payload.expectedUpdatedAt !== "number" ||
      !Number.isSafeInteger(payload.expectedUpdatedAt) ||
      payload.expectedUpdatedAt < 0
    ) {
      return Response.json({ error: "The lore revision is invalid." }, { status: 400 });
    }

    const result = await updateLoreEntryStatus(
      id,
      payload.targetStatus as LoreStatus,
      payload.expectedUpdatedAt,
    );
    if (!result.success) {
      if (result.reason === "not-found") {
        return Response.json({ error: "Lore record not found." }, { status: 404 });
      }
      if (result.reason === "unchanged") {
        return Response.json({ error: "The lore record already has that status." }, { status: 409 });
      }
      return Response.json(
        { error: "The lore record changed before its status could be updated. Reload and review it again." },
        { status: 409 },
      );
    }

    return Response.json(
      { success: true, entry: result.value.entry },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "lore-status-update-failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ error: "The lore status could not be changed." }, { status: 500 });
  }
}
