import { getBadgeKey, getChapterAssets } from "../../../storage/chapter-assets";
import { getArchiveAdmin, getArchiveViewer } from "../../archive-auth";

export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const maxBytes = 50 * 1024 * 1024;

async function requireAdmin() {
  return Boolean(await getArchiveAdmin());
}

export async function GET() {
  try {
    if (!(await getArchiveViewer())) {
      return Response.json({ error: "Sign in to view this asset." }, { status: 401 });
    }
    const object = await getChapterAssets().get(getBadgeKey());
    if (!object) {
      return new Response(null, { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "no-store");
    return new Response(object.body, { headers });
  } catch {
    return Response.json({ error: "Badge storage is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return Response.json({ error: "Admin access is required." }, { status: 403 });
    }
    const form = await request.formData();
    const badge = form.get("badge");

    if (!(badge instanceof File)) {
      return Response.json({ error: "Choose an image to upload." }, { status: 400 });
    }
    if (!allowedTypes.has(badge.type)) {
      return Response.json({ error: "Use a PNG, JPG, WEBP, or GIF image." }, { status: 415 });
    }
    if (badge.size > maxBytes) {
      return Response.json({ error: "The image must be smaller than 50 MB." }, { status: 413 });
    }

    await getChapterAssets().put(getBadgeKey(), badge.stream(), {
      httpMetadata: { contentType: badge.type },
      customMetadata: { originalName: badge.name.slice(0, 120) },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "The badge could not be uploaded." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    if (!(await requireAdmin())) {
      return Response.json({ error: "Admin access is required." }, { status: 403 });
    }
    await getChapterAssets().delete(getBadgeKey());
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "The badge could not be removed." }, { status: 500 });
  }
}
