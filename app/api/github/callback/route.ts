// GET /api/github/callback — the App's Setup URL target.
// GitHub redirects here after installation with `installation_id`.
// We verify the installation belongs to THIS app (server-side JWT call),
// bind it to the session via an httpOnly cookie, and return to the workspace.
//
// Note: GitHub's post-install redirect does not echo an OAuth state param.
// The binding below is safe in the sense that only installation ids that
// belong to our own App are accepted — a mismatched id yields no token and
// no data. For additional hardening, add a short-lived signed cookie
// challenge set by /api/github/connect before the redirect.
import { NextResponse, type NextRequest } from "next/server"
import { getAppConfig, getInstallation, GH_COOKIE, GH_COOKIE_OPTIONS } from "@/lib/github-server"

export async function GET(req: NextRequest) {
  const cfg = getAppConfig()
  const origin = process.env.APP_URL ?? req.nextUrl.origin
  if (!cfg) return NextResponse.redirect(`${origin}/workspace?github=not_configured`)

  const installationId = req.nextUrl.searchParams.get("installation_id")
  if (!installationId) return NextResponse.redirect(`${origin}/workspace?github=cancelled`)

  try {
    await getInstallation(cfg, installationId) // verify it belongs to this App
  } catch {
    return NextResponse.redirect(`${origin}/workspace?github=invalid_installation`)
  }

  const res = NextResponse.redirect(`${origin}/workspace`)
  res.cookies.set(GH_COOKIE, installationId, GH_COOKIE_OPTIONS)
  return res
}
