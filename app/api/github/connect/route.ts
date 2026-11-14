// POST /api/github/connect — starts the GitHub App installation flow.
// Returns an installUrl the browser is redirected to. After installing,
// GitHub redirects to the App's Setup URL → /api/github/callback, which
// binds the installation to this session via an httpOnly cookie.
import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { getAppConfig, getInstallation, GH_COOKIE } from "@/lib/github-server"

export async function POST(req: NextRequest) {
  const cfg = getAppConfig()
  if (!cfg) return NextResponse.json({ error: "GitHub App not configured — set GITHUB_APP_* environment variables" }, { status: 501 })

  // Already bound to an installation in this session?
  const existing = (await cookies()).get(GH_COOKIE)?.value
  if (existing) {
    try {
      const inst = await getInstallation(cfg, existing)
      return NextResponse.json({
        account: { login: inst.account.login, name: inst.account.name || inst.account.login, avatarUrl: inst.account.avatar_url },
      })
    } catch {
      // Stale installation — fall through to a fresh install URL.
    }
  }

  // The user chooses which repositories the App may access on this page.
  // GitHub redirects back to the App's Setup URL when installation completes.
  return NextResponse.json({ installUrl: `https://github.com/apps/${cfg.slug}/installations/new` })
}
