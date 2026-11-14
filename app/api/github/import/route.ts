// POST /api/github/import — imports the selected repositories.
// Body: { repoIds: number[] }
// For each repo we really read: repository metadata, README, languages and
// (when present) package.json dependencies. Results include per-repo
// statuses matching the frontend import progress screen, plus the final
// succeeded/failed outcome. Nothing is fabricated.
import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { getAppConfig, createInstallationToken, listInstallationRepos, importRepos, GH_COOKIE } from "@/lib/github-server"

export async function POST(req: NextRequest) {
  const cfg = getAppConfig()
  if (!cfg) return NextResponse.json({ error: "GitHub App not configured — set GITHUB_APP_* environment variables" }, { status: 501 })

  const installationId = (await cookies()).get(GH_COOKIE)?.value
  if (!installationId) return NextResponse.json({ error: "Not connected" }, { status: 401 })

  let repoIds: number[]
  try {
    const body = (await req.json()) as { repoIds?: unknown }
    repoIds = Array.isArray(body.repoIds) ? body.repoIds.filter((x): x is number => typeof x === "number") : []
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  if (repoIds.length === 0) return NextResponse.json({ error: "No repositories selected" }, { status: 400 })
  if (repoIds.length > 50) return NextResponse.json({ error: "Import at most 50 repositories at a time" }, { status: 400 })

  try {
    const token = await createInstallationToken(cfg, installationId)
    const repos = await listInstallationRepos(token)
    const outcome = await importRepos(token, repos, repoIds)
    return NextResponse.json(outcome)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Import failed" }, { status: 502 })
  }
}
