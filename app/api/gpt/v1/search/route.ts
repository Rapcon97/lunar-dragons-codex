import { searchGPTLore } from "../../../../gpt-api-adapter";
import { requireGPTApiKey } from "../../../../gpt-api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authResponse = requireGPTApiKey(request);

  if (authResponse) {
    return authResponse;
  }

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();

    if (!query) {
      return Response.json(
        {
          error: "A search query is required.",
        },
        { status: 400 },
      );
    }

    if (query.length > 500) {
      return Response.json(
        {
          error: "The search query is too long.",
        },
        { status: 400 },
      );
    }

    const search = await searchGPTLore(query);

    return Response.json(
      {
        query: search.query,
        count: search.count,
        source: search.source,
        results: search.results,
      },
      {
  headers: {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  },
},
    );
  } catch (error) {
    console.error("GPT search API error:", error);

    return Response.json(
      {
        error: "The Lunar Dragons archive search is unavailable.",
      },
      { status: 503 },
    );
  }
}
