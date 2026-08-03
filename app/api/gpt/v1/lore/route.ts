import { getGPTLore } from "../../../../gpt-api-adapter";
import { requireGPTApiKey } from "../../../../gpt-api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authResponse = requireGPTApiKey(request);

  if (authResponse) {
    return authResponse;
  }

  try {
    const lore = await getGPTLore();

    return Response.json(
      {
        source: lore.source,
        persisted: lore.persisted,
        chapter: lore.chapter,
        timeline: lore.timeline,
        relics: lore.relics,
        sector: lore.sector,
      },
    {
        headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
    },
}
    );
  } catch (error) {
    console.error("GPT lore API error:", error);

    return Response.json(
      {
        error: "The Lunar Dragons archive is unavailable.",
      },
      { status: 503 },
    );
  }
}