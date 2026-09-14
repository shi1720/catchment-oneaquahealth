import { parseRainfall, RAINFALL_URL } from "@/lib/catchment/rainfall";
export async function GET() {
  try {
    const response = await fetch(RAINFALL_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error("Rainfall upstream unavailable");
    return Response.json(parseRainfall(await response.json()), {
      headers: {
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      {
        status: "unavailable",
        message:
          "Rainfall data could not be loaded. Your demonstration and field workflow still work.",
        sourceUrl: RAINFALL_URL,
        fetchedAt: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
