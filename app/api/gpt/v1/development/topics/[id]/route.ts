import { getGPTDevelopmentTopicById } from "../../../../../../gpt-api-adapter";
import { requireGPTApiKey } from "../../../../../../gpt-api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResponse = requireGPTApiKey(request);
  if (authResponse) return authResponse;
  const { id } = await context.params;
  const result = await getGPTDevelopmentTopicById(id ?? "");
  if (!result.success) {
    return Response.json({ error: "Development topic not found." }, { status: 404 });
  }
  return Response.json(result, { headers: { "cache-control": "no-store" } });
}
