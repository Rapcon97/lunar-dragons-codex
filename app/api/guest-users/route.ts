import { getArchiveAdmin, isSameOriginRequest } from "../../archive-auth";
import {
  createGuestAccount,
  deleteGuestAccount,
  listGuestAccounts,
  normalizeGuestUsername,
} from "../../../storage/guest-accounts";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  return Boolean(await getArchiveAdmin());
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return Response.json({ error: "Admin access is required." }, { status: 403 });
    }
    return Response.json(
      { users: await listGuestAccounts() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "guest-account-list-failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ error: "Guest accounts are unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return Response.json({ error: "Admin access is required." }, { status: 403 });
    }
    if (!isSameOriginRequest(request)) {
      return Response.json({ error: "Invalid account request." }, { status: 403 });
    }
    const body = (await request.json()) as {
      username?: unknown;
      displayName?: unknown;
      passphrase?: unknown;
    };
    const username = typeof body.username === "string" ? normalizeGuestUsername(body.username) : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const passphrase = typeof body.passphrase === "string" ? body.passphrase : "";

    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
      return Response.json(
        { error: "Use 3–32 lowercase letters, numbers, dots, dashes, or underscores." },
        { status: 400 },
      );
    }
    if (!displayName || displayName.length > 60) {
      return Response.json({ error: "Enter a display name of 60 characters or fewer." }, { status: 400 });
    }
    if (passphrase.length < 12 || passphrase.length > 128) {
      return Response.json({ error: "Use a passphrase between 12 and 128 characters." }, { status: 400 });
    }

    const user = await createGuestAccount(username, displayName, passphrase);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "GUEST_USERNAME_TAKEN") {
      return Response.json({ error: "That guest username already exists." }, { status: 409 });
    }
    console.error(
      "guest-account-create-failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ error: "The guest account could not be created." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return Response.json({ error: "Admin access is required." }, { status: 403 });
    }
    if (!isSameOriginRequest(request)) {
      return Response.json({ error: "Invalid account request." }, { status: 403 });
    }
    const body = (await request.json()) as { id?: unknown };
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return Response.json({ error: "Choose a guest account." }, { status: 400 });
    await deleteGuestAccount(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(
      "guest-account-delete-failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json({ error: "The guest account could not be removed." }, { status: 500 });
  }
}
