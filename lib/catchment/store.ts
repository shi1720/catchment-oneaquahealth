import { env } from "cloudflare:workers";
import { seedWorkspace, assess } from "./engine";
import type { Snapshot, Workspace } from "./model";
const COOKIE = "catchment_workspace";
const MAX_AGE = 30 * 86400;
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
type Row = { id: string; data: string; revision: number; expires_at: number };
function db() {
  if (!env.DB)
    throw new ApiError(
      503,
      "Workspace storage is temporarily unavailable. Your unsaved form is still here.",
    );
  return env.DB;
}
export function sessionId(req: Request) {
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
}
export async function readSession(
  req: Request,
  create = false,
): Promise<{
  id: string;
  workspace: Workspace;
  revision: number;
  cookie?: string;
}> {
  let id = sessionId(req);
  const now = Date.now();
  if (id && /^[a-f0-9-]{73}$/.test(id)) {
    const row = await db()
      .prepare(
        "SELECT id, data, revision, expires_at FROM workspaces WHERE id = ? AND expires_at > ?",
      )
      .bind(id, now)
      .first<Row>();
    if (row)
      return {
        id,
        workspace: JSON.parse(row.data) as Workspace,
        revision: row.revision,
      };
  }
  if (!create)
    throw new ApiError(
      401,
      "This demonstration session expired. Reload to start a new workspace.",
    );
  id = crypto.randomUUID() + "-" + crypto.randomUUID();
  const workspace = seedWorkspace(now);
  await db()
    .prepare(
      "INSERT INTO workspaces (id, data, revision, created_at, expires_at) VALUES (?, ?, 0, ?, ?)",
    )
    .bind(id, JSON.stringify(workspace), now, now + MAX_AGE * 1000)
    .run();
  // Bounded opportunistic cleanup. A scheduled purge is also documented for a production pilot.
  await db()
    .prepare(
      "DELETE FROM workspaces WHERE id IN (SELECT id FROM workspaces WHERE expires_at < ? LIMIT 20)",
    )
    .bind(now)
    .run();
  return {
    id,
    workspace,
    revision: 0,
    cookie: `${COOKIE}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}
export async function persist(
  id: string,
  workspace: Workspace,
  revision: number,
) {
  const data = JSON.stringify(workspace);
  if (new TextEncoder().encode(data).length > 512000)
    throw new ApiError(
      413,
      "This demonstration workspace is full. Export your evidence, then reset it.",
    );
  const row = await db()
    .prepare(
      "UPDATE workspaces SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ? AND expires_at > ? RETURNING revision",
    )
    .bind(data, id, revision, Date.now())
    .first<{ revision: number }>();
  if (!row)
    throw new ApiError(
      409,
      "The workspace changed in another tab. Reload the latest evidence and try again.",
    );
  return row.revision;
}
export function snapshot(workspace: Workspace, revision: number): Snapshot {
  return { workspace, revision, assessments: assess(workspace) };
}
export function json(value: unknown, status = 200, cookie?: string) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  });
}
export function errorResponse(error: unknown) {
  if (error instanceof ApiError)
    return json({ error: error.message }, error.status);
  console.error(
    "Catchment request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json(
    {
      error:
        "The service could not finish this request. Your input has been preserved. Please try again.",
    },
    503,
  );
}
export function verifyOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (
    !origin ||
    origin !== new URL(req.url).origin ||
    req.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new ApiError(
      403,
      "This action must originate from your Catchment workspace.",
    );
}
