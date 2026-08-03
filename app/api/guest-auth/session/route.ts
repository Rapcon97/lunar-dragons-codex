import {
  clearGuestSessionCookie,
  guestSessionCookie,
  isSameOriginRequest,
} from "../../../archive-auth";
import {
  createGuestSessionToken,
  verifyGuestCredentials,
} from "../../../../storage/guest-accounts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json({ error: "Invalid login request." }, { status: 403 });
    }
    const body = (await request.json()) as { username?: unknown; passphrase?: unknown };
    const username = typeof body.username === "string" ? body.username : "";
    const passphrase = typeof body.passphrase === "string" ? body.passphrase : "";
    if (!username || username.length > 64 || !passphrase || passphrase.length > 256) {
      return Response.json({ error: "Enter your username and passphrase." }, { status: 400 });
    }

    const account = await verifyGuestCredentials(username, passphrase);
    if (!account) {
      return Response.json(
        { error: "The guest credentials were not recognised. Repeated failures are temporarily locked." },
        { status: 401 },
      );
    }

    const token = await createGuestSessionToken(account);
    return Response.json(
      { ok: true, displayName: account.displayName },
      { headers: { "set-cookie": guestSessionCookie(token), "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Guest authentication is currently unavailable." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("action") !== "logout") {
    return Response.json({ error: "Unsupported request." }, { status: 405 });
  }
  return new Response(null, {
    status: 303,
    headers: {
      location: "/",
      "set-cookie": clearGuestSessionCookie(),
      "cache-control": "no-store",
    },
  });
}
