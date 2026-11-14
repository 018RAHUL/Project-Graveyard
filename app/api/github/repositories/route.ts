// GET /api/github/repositories — repositories the installation can access.
// Uses a short-lived installation access token minted server-side.
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAppConfig, createInstallationToken, listInstallationRepos, GH_COOKIE } from "@/lib/github-server"

export async function GET() {
  const cfg = getAppConfig()
  if (!cfg) return NextResponse.json({ error: "GitHub App not configured — set GITHUB_APP_* environment variables" }, { status: 501 })

  const installationId = (await cookies()).get(GH_COOKIE)?.value
  if (!installationId) return NextResponse.json({ error: "Not connected" }, { status: 401 })

  try {
    const token = await createInstallationToken(cfg, installationId)
    return NextResponse.json(await listInstallationRepos(token))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not list repositories" }, { status: 502 })
  }
}
