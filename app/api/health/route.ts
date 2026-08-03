export async function GET() {
  return Response.json({
    status: "ok",
    application: "Lunar Dragons Codex",
    api: "online",
  });
}