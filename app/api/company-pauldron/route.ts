import {
  getArchiveAdmin,
  getArchiveViewer,
  isSameOriginRequest,
} from "../../archive-auth";
import {
  getChapterAssets,
  getCompanyPauldronKey,
} from "../../../storage/chapter-assets";

export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const maxBytes = 50 * 1024 * 1024;

function parseCompanyNumber(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string" || !/^(?:[1-9]|10|11)$/.test(value)) return null;
  return Number.parseInt(value, 10);
}

function companyFromUrl(request: Request) {
  return parseCompanyNumber(new URL(request.url).searchParams.get("company"));
}

export async function GET(request: Request) {
  try {
    if (!(await getArchiveViewer())) {
      return Response.json({ error: "Sign in to view this asset." }, { status: 401 });
    }
    const companyNumber = companyFromUrl(request);
    if (!companyNumber) {
      return Response.json({ error: "Choose a valid company." }, { status: 400 });
    }

    const object = await getChapterAssets().get(getCompanyPauldronKey(companyNumber));
    if (!object) return new Response(null, { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "no-store");
    return new Response(object.body, { headers });
  } catch (error) {
    console.error(
      "company-pauldron-read-failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ error: "Company pauldron storage is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getArchiveAdmin())) {
      return Response.json({ error: "Admin access is required." }, { status: 403 });
    }
    if (!isSameOriginRequest(request)) {
      return Response.json({ error: "Invalid upload request." }, { status: 403 });
    }

    const form = await request.formData();
    const companyNumber = parseCompanyNumber(form.get("company"));
    const pauldron = form.get("pauldron");
    if (!companyNumber) {
      return Response.json({ error: "Choose a valid company." }, { status: 400 });
    }
    if (!(pauldron instanceof File) || pauldron.size === 0) {
      return Response.json({ error: "Choose an image to upload." }, { status: 400 });
    }
    if (!allowedTypes.has(pauldron.type)) {
      return Response.json({ error: "Use a PNG, JPG, WEBP, or GIF image." }, { status: 415 });
    }
    if (pauldron.size > maxBytes) {
      return Response.json({ error: "The image must be smaller than 50 MB." }, { status: 413 });
    }

    await getChapterAssets().put(getCompanyPauldronKey(companyNumber), pauldron.stream(), {
      httpMetadata: { contentType: pauldron.type },
      customMetadata: {
        company: String(companyNumber),
        originalName: pauldron.name.slice(0, 120),
      },
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(
      "company-pauldron-upload-failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ error: "The company pauldron could not be uploaded." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await getArchiveAdmin())) {
      return Response.json({ error: "Admin access is required." }, { status: 403 });
    }
    if (!isSameOriginRequest(request)) {
      return Response.json({ error: "Invalid removal request." }, { status: 403 });
    }
    const companyNumber = companyFromUrl(request);
    if (!companyNumber) {
      return Response.json({ error: "Choose a valid company." }, { status: 400 });
    }

    await getChapterAssets().delete(getCompanyPauldronKey(companyNumber));
    return Response.json({ ok: true });
  } catch (error) {
    console.error(
      "company-pauldron-delete-failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ error: "The company pauldron could not be removed." }, { status: 500 });
  }
}
