import { appendGPTChronicleEntry } from "../../../../gpt-api-adapter";
import { requireGPTApiKey } from "../../../../gpt-api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authResponse = requireGPTApiKey(request);

  if (authResponse) {
    return authResponse;
  }

  try {
    const body = (await request.json()) as {
      entry?: unknown;
    };

    if (typeof body.entry !== "string") {
      return Response.json(
        {
          error: "A chronicle entry is required.",
        },
        { status: 400 },
      );
    }

    const entry = body.entry.trim();

    if (!entry) {
      return Response.json(
        {
          error: "The chronicle entry cannot be empty.",
        },
        { status: 400 },
      );
    }

    if (entry.length > 4000) {
      return Response.json(
        {
          error: "The chronicle entry is too long.",
        },
        { status: 400 },
      );
    }

    const result = await appendGPTChronicleEntry(entry);

    if (!result.success) {
      return Response.json(
        {
          error:
            result.reason === "duplicate"
              ? "That chronicle entry already exists."
              : "The archive changed while the chronicle entry was being added. Retry the request.",
        },
        { status: 409 },
      );
    }

    return Response.json(
  {
    success: true,
    added: entry,
    timelineCount: result.timelineCount,
  },
  {
    status: 201,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  },
);
  } catch (error) {
    console.error("GPT chronicle API error:", error);

    return Response.json(
      {
        error: "The chronicle entry could not be added.",
      },
      { status: 500 },
    );
  }
}
