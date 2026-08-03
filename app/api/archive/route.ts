import { type ArchiveSection, normalizeArchiveData } from "../../archive-data";
import { getArchiveAdmin, getArchiveViewer } from "../../archive-auth";
import {
  readChapterArchive,
  resetChapterArchive,
  writeChapterArchive,
  writeChapterArchiveSection,
} from "../../../storage/chapter-records";

export const dynamic = "force-dynamic";

const archiveSections = new Set<ArchiveSection>([
  "identity",
  "milestones",
  "relics",
  "companies",
  "entries",
  "voxQuotes",
  "badgeMode",
  "sectorIntel",
]);

async function authenticatedUser() {
  return getArchiveViewer();
}

async function adminUser() {
  return getArchiveAdmin();
}

export async function GET() {
  try {
    if (!(await authenticatedUser())) {
      return Response.json({ error: "Sign in to view the archive." }, { status: 401 });
    }
    const data = await readChapterArchive();
    return Response.json(
      { data: data ?? normalizeArchiveData(undefined), persisted: Boolean(data) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "The chapter records are unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await adminUser())) {
      return Response.json({ error: "Admin access is required." }, { status: 403 });
    }
    const body = (await request.json()) as { data?: unknown };
    const data = await writeChapterArchive(body.data);
    return Response.json({ data, persisted: true });
  } catch {
    return Response.json({ error: "The chapter records could not be saved." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await adminUser())) {
      return Response.json({ error: "Admin access is required." }, { status: 403 });
    }
    const body = (await request.json()) as { section?: string; value?: unknown };
    if (!body.section || !archiveSections.has(body.section as ArchiveSection)) {
      return Response.json({ error: "Choose a valid archive section." }, { status: 400 });
    }
    const data = await writeChapterArchiveSection(body.section as ArchiveSection, body.value);
    return Response.json({ data, persisted: true });
  } catch {
    return Response.json({ error: "The chapter records could not be updated." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    if (!(await adminUser())) {
      return Response.json({ error: "Admin access is required." }, { status: 403 });
    }
    const data = await resetChapterArchive();
    return Response.json({ data, persisted: true });
  } catch {
    return Response.json({ error: "The chapter records could not be reset." }, { status: 500 });
  }
}
