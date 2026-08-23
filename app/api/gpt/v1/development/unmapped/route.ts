import { getGPTUnmappedDevelopmentLore } from "../../../../../gpt-api-adapter";
import { requireGPTApiKey } from "../../../../../gpt-api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authResponse = requireGPTApiKey(request);
  if (authResponse) return authResponse;
  const url = new URL(request.url);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  if (!Number.isSafeInteger(offset) || offset < 0) {
    return Response.json({ error: "The entry offset must be a non-negative integer." }, { status: 400 });
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    return Response.json({ error: "The entry limit must be an integer from 1 to 50." }, { status: 400 });
  }
  return Response.json(await getGPTUnmappedDevelopmentLore({ offset, limit }), {
    headers: { "cache-control": "no-store" },
  });
}
