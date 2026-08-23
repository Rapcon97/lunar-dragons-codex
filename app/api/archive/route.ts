import {
  canonChronicleEntries,
  type ArchiveSection,
  type ChapterArchiveData,
  normalizeArchiveData,
} from "../../archive-data";
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
  "characters",
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

function archiveForViewer(data: ChapterArchiveData, canAdmin: boolean) {
  if (canAdmin) return data;

  return {
    ...data,
    milestones: data.milestones.filter((milestone) => !milestone.topicId),
    entries: canonChronicleEntries(data),
    loreEntries: data.loreEntries.filter((entry) => entry.status === "canon")
      .map(({ developmentTopicIds: _developmentTopicIds, ...entry }) => {
        void _developmentTopicIds;
        return entry;
      }),
  };
}

export async function GET() {
  try {
    const viewer = await authenticatedUser();
    if (!viewer) {
      return Response.json({ error: "Sign in to view the archive." }, { status: 401 });
    }
    const storedData = await readChapterArchive();
    const data = storedData ?? normalizeArchiveData(undefined);
    return Response.json(
      {
        data: archiveForViewer(data, viewer.canAdmin),
        persisted: Boolean(storedData),
      },
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
