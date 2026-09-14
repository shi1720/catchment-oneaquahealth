import { readSession, errorResponse, ApiError } from "@/lib/catchment/store";
import { csvExport, evidenceExport, fhirExport } from "@/lib/catchment/exports";
export async function GET(req: Request) {
  try {
    const { workspace } = await readSession(req);
    const format = new URL(req.url).searchParams.get("format") ?? "json";
    if (!["csv", "json", "fhir"].includes(format))
      throw new ApiError(400, "Choose csv, json or fhir.");
    return new Response(
      format === "csv"
        ? csvExport(workspace)
        : JSON.stringify(
            format === "fhir"
              ? fhirExport(workspace)
              : evidenceExport(workspace),
            null,
            2,
          ),
      {
        headers: {
          "Content-Type":
            format === "csv"
              ? "text/csv; charset=utf-8"
              : format === "fhir"
                ? "application/fhir+json"
                : "application/json",
          "Content-Disposition": `attachment; filename="catchment-${format}.${format === "csv" ? "csv" : "json"}"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
