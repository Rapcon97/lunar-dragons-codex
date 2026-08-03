import { env } from "cloudflare:workers";

export function requireGPTApiKey(request: Request): Response | null {
  const expectedKey = (env as { GPT_API_KEY?: string }).GPT_API_KEY;

  if (!expectedKey) {
    console.error("GPT_API_KEY is not configured.");

    return Response.json(
      {
        error: "GPT API authentication is not configured.",
      },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization");


  if (authorization !== `Bearer ${expectedKey}`) {
    return Response.json(
      {
        error: "Unauthorized.",
      },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": "Bearer",
        },
      },
    );
  }

  return null;
}