// GET  /api/github/connection — connection status for the current session
// DELETE /api/github/connection — disconnect (clears the session cookie;
//   the user may additionally uninstall the App on GitHub at any time).
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAppConfig, getInstallation, GH_COOKIE } from "@/lib/github-server"

export async function GET() {
  const cfg = getAppConfig()
  if (!cfg) return NextResponse.json({ error: "GitHub App not configured — set GITHUB_APP_* environment variables" }, { status: 501 })

  const installationId = (await cookies()).get(GH_COOKIE)?.value
  if (!installationId) {
    return NextResponse.json({ status: "not_connected", account: null, installationId: null })
  }

  try {
    const inst = await getInstallation(cfg, installationId)
    return NextResponse.json({
      status: "connected",
      account: { login: inst.account.login, name: inst.account.name || inst.account.login, avatarUrl: inst.account.avatar_url },
      installationId: inst.id,
    })
  } catch {
    // Unknown/expired/uninstalled installation — treat as not connected.
    return NextResponse.json({ status: "not_connected", account: null, installationId: null })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(GH_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 })
  return res
}
