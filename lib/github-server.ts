// Server-side GitHub App helpers. THIS FILE RUNS ON THE SERVER ONLY.
//
// SECURITY
// - The App private key is read from environment variables and used to mint
//   short-lived RS256 JWTs, which are exchanged for installation access
//   tokens. Neither the key nor the tokens ever leave the server.
// - The browser only ever talks to our own /api/github/* routes.
// - We deliberately do NOT use personal access tokens or passwords.

import crypto from "node:crypto"
import type { GitHubRepo, ImportOutcome, RepoImportStatus } from "./github"

export const GH_COOKIE = "gityard_gh"

export const GH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

type AppConfig = { appId: string; slug: string; privateKey: string }

/** Reads GitHub App config from env. Returns null when not configured. */
export function getAppConfig(): AppConfig | null {
  const appId = process.env.GITHUB_APP_ID
  const slug = process.env.GITHUB_APP_SLUG
  let privateKey = process.env.GITHUB_APP_PRIVATE_KEY ?? ""
  const b64 = process.env.GITHUB_APP_PRIVATE_KEY_BASE64
  if (!privateKey && b64) privateKey = Buffer.from(b64, "base64").toString("utf8")
  if (privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n")
  if (!appId || !slug || !privateKey.includes("PRIVATE KEY")) return null
  return { appId, slug, privateKey }
}

const b64url = (s: string) =>
  Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

/** RS256 JWT signed with the App private key, as GitHub requires. */
export function appJwt(cfg: AppConfig): string {
  const iat = Math.floor(Date.now() / 1000) - 30
  const exp = iat + 8 * 60 // GitHub rejects JWTs older than ~10 minutes
  const input = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ iat, exp, iss: Number(cfg.appId) }),
  )}`
  const sig = crypto.createSign("RSA-SHA256").update(input).sign(cfg.privateKey, "base64")
  return `${input}.${sig.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`
}

const API = "https://api.github.com"

type GhAuth = { token?: string; jwt?: string; accept?: string }

async function gh(path: string, auth: GhAuth = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Accept: auth.accept ?? "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${auth.token ?? auth.jwt ?? ""}`,
      "User-Agent": "Gityard",
    },
    cache: "no-store",
  })
  if (!res.ok) {
    const detail = res.status === 403 ? " — permission denied or rate limit" : res.status === 404 ? " — not found" : ""
    throw new Error(`GitHub API ${res.status}${detail}`)
  }
  return res
}

type Installation = {
  id: number
  account: { login: string; name?: string | null; avatar_url: string | null }
}

/** Fetches one installation and verifies it belongs to THIS app. */
export async function getInstallation(cfg: AppConfig, installationId: string): Promise<Installation> {
  const res = await gh(`/app/installations/${installationId}`, { jwt: appJwt(cfg) })
  const data = (await res.json()) as Installation & { app_id: number }
  // Guard: an installation id from another app must not be accepted.
  if (Number(data.app_id) !== Number(cfg.appId)) throw new Error("Installation does not belong to this GitHub App")
  return data
}

/** Mints a short-lived installation access token (1 hour, server-side only). */
export async function createInstallationToken(cfg: AppConfig, installationId: string): Promise<string> {
  const res = await gh(`/app/installations/${installationId}/access_tokens`, { jwt: appJwt(cfg) })
  return ((await res.json()) as { token: string }).token
}

export function mapRepo(r: {
  id: number
  name: string
  full_name: string
  owner: { login: string }
  description: string | null
  language: string | null
  private: boolean
  updated_at: string
  html_url: string
}): GitHubRepo {
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    owner: r.owner.login,
    description: r.description,
    language: r.language,
    visibility: r.private ? "private" : "public",
    updatedAt: r.updated_at,
    htmlUrl: r.html_url,
    imported: false,
  }
}

/** Lists repositories the installation can access (paginated). */
export async function listInstallationRepos(token: string): Promise<GitHubRepo[]> {
  const all: GitHubRepo[] = []
  for (let page = 1; page <= 5; page++) {
    const res = await gh(`/installation/repositories?per_page=100&page=${page}`, { token })
    const data = (await res.json()) as { repositories: Parameters<typeof mapRepo>[0][] }
    all.push(...data.repositories.map(mapRepo))
    if (data.repositories.length < 100) break
  }
  return all
}

type RepoAnalysis = { technologies: string[]; description: string | null; readme: string | null }

/** Real import work: repo metadata, README, languages and (when present)
 *  package.json dependencies. All plain GitHub reads — no analysis is faked. */
export async function analyzeRepo(token: string, repo: GitHubRepo): Promise<RepoAnalysis> {
  const full = repo.fullName

  const languagesRes = await gh(`/repos/${full}/languages`, { token })
  const languages = Object.keys((await languagesRes.json()) as Record<string, number>)
  const technologies = languages.slice(0, 3)

  let readme: string | null = null
  try {
    const readmeRes = await gh(`/repos/${full}/readme`, { token, accept: "application/vnd.github.raw+json" })
    readme = await readmeRes.text()
  } catch {
    // Repositories without a README are fine.
  }

  // package.json dependencies, when the repo has one, are real detected tech.
  try {
    const pkgRes = await gh(`/repos/${full}/contents/package.json`, { token })
    const pkg = JSON.parse(Buffer.from(((await pkgRes.json()) as { content: string }).content, "base64").toString("utf8")) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    for (const dep of [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]) {
      if (technologies.length >= 6) break
      if (!technologies.includes(dep)) technologies.push(dep)
    }
  } catch {
    // No package.json — fine.
  }

  let description = repo.description
  if (!description && readme) {
    // First plain-text paragraph of the README, as a fallback description.
    const para = readme
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .find((s) => s && !s.startsWith("#") && !s.startsWith("!") && !s.startsWith("<"))
    description = para ? para.split("\n").join(" ").slice(0, 200) : null
  }

  return { technologies, description, readme }
}

export type ImportStep = { statuses: RepoImportStatus[] }

/** Runs the real import pipeline for the selected repos and produces the same
 *  status/outcome shapes the frontend import screen renders. */
export async function importRepos(
  token: string,
  repos: GitHubRepo[],
  repoIds: number[],
): Promise<ImportOutcome & { statuses: RepoImportStatus[] }> {
  const chosen = repos.filter((r) => repoIds.includes(r.id))
  const statuses: RepoImportStatus[] = chosen.map((r) => ({ repoId: r.id, name: r.name, state: "queued", stage: 0 }))
  const succeeded: GitHubRepo[] = []
  const failed: ImportOutcome["failed"] = []

  for (const repo of chosen) {
    const s = statuses.find((x) => x.repoId === repo.id)!
    try {
      s.state = "running"
      s.stage = 1 // fetching repository information
      const analysis = await analyzeRepo(token, repo)
      s.stage = 5 // preparing projects for Gityard
      s.state = "done"
      succeeded.push({ ...repo, description: analysis.description ?? repo.description, technologies: analysis.technologies })
    } catch (e) {
      s.state = "failed"
      s.error = e instanceof Error ? e.message : "Import failed"
      failed.push({ name: repo.name, reason: s.error })
    }
  }
  return { succeeded, failed, statuses }
}
