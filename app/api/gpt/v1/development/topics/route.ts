import { getGPTDevelopmentTopics } from "../../../../../gpt-api-adapter";
import { requireGPTApiKey } from "../../../../../gpt-api-auth";
import {
  DEVELOPMENT_DOMAINS,
  DEVELOPMENT_TOPIC_STATUSES,
  type DevelopmentDomain,
  type DevelopmentTopicStatus,
} from "../../../../../chapter-development";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authResponse = requireGPTApiKey(request);
  if (authResponse) return authResponse;

  const url = new URL(request.url);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const domain = url.searchParams.get("domain") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  if (!Number.isSafeInteger(offset) || offset < 0) {
    return Response.json({ error: "The topic offset must be a non-negative integer." }, { status: 400 });
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    return Response.json({ error: "The topic limit must be an integer from 1 to 50." }, { status: 400 });
  }
  if (domain && !DEVELOPMENT_DOMAINS.some((item) => item.id === domain)) {
    return Response.json({ error: "Unknown development domain." }, { status: 400 });
  }
  if (status && !DEVELOPMENT_TOPIC_STATUSES.includes(status as never)) {
    return Response.json({ error: "Unknown development status." }, { status: 400 });
  }

  const result = await getGPTDevelopmentTopics({
    offset,
    limit,
    ...(domain ? { domain: domain as DevelopmentDomain } : {}),
    ...(status ? { status: status as DevelopmentTopicStatus } : {}),
  });
  return Response.json(result, { headers: { "cache-control": "no-store" } });
}
