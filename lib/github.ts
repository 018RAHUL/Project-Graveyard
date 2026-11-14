// Gityard GitHub integration — shared types + client contract.
//
// ARCHITECTURE / SECURITY
// - The real integration is a GitHub App (installation flow). Installation
//   access tokens are created server-side and are NEVER sent to the browser.
//   Private keys / client secrets live only on the backend.
// - Least-privilege permissions requested by the App:
//     * Repository metadata: read
//     * Repository contents (README, file structure): read
//     * Commit information: read (where required)
//   No write permissions are ever requested. Users choose which repositories
//   the App can access and can revoke access from GitHub or from Gityard.
// - The frontend only codes against the `GitHubClient` interface. Two
//   implementations exist:
//     * HttpGitHubClient  → real backend at /api/github/* (activated when
//       NEXT_PUBLIC_GITYARD_GITHUB_API is set). Expected endpoints:
//         GET    /api/github/connection     → GitHubConnection
//         POST   /api/github/connect        → starts/finishes the App install flow
//         GET    /api/github/repositories   → GitHubRepo[] (installation repos)
//         POST   /api/github/import         → { repoIds } ⇒ ImportOutcome
//         DELETE /api/github/connection     → revoke
//     * DemoGitHubClient  → clearly-labeled simulated data for the
//       frontend prototype (default until the backend exists). Demo mode
//       never contacts GitHub and is always marked as demo data in the UI.

export type GitHubAccount = {
  login: string
  name: string
  avatarUrl: string | null
}

export type GitHubConnection = {
  status: "connected" | "not_connected"
  account: GitHubAccount | null
  /** GitHub App installation id, present when connected. */
  installationId: number | null
}

export type GitHubRepo = {
  id: number
  /** e.g. "campus-connect" */
  name: string
  /** e.g. "jordan-davis/campus-connect" */
  fullName: string
  owner: string
  description: string | null
  language: string | null
  visibility: "public" | "private"
  /** ISO timestamp */
  updatedAt: string
  htmlUrl: string
  /** True when this repository has already been imported into the archive. */
  imported: boolean
}

/** Ordered import pipeline shown on the import progress screen. */
export const IMPORT_STAGES = [
  { id: "connect", label: "Connecting to GitHub" },
  { id: "metadata", label: "Fetching repository information" },
  { id: "structure", label: "Reading repository structure" },
  { id: "readme", label: "Analyzing README files" },
  { id: "technologies", label: "Detecting technologies" },
  { id: "prepare", label: "Preparing projects for Gityard" },
] as const

export type ImportStage = (typeof IMPORT_STAGES)[number]

export type RepoImportStatus = {
  repoId: number
  name: string
  state: "queued" | "running" | "done" | "failed"
  /** Index into IMPORT_STAGES the repo has reached. */
  stage: number
  error?: string
}

export type ImportOutcome = {
  succeeded: GitHubRepo[]
  failed: { name: string; reason: string }[]
}

export interface GitHubClient {
  /** "demo" = simulated data (always labeled in the UI), "live" = real backend. */
  mode: "demo" | "live"
  getConnection(): Promise<GitHubConnection>
  /** Starts the GitHub App connection. In production this redirects through
   *  github.com/apps/<app>/installations/new; the backend completes the
   *  handshake and returns the account. */
  connect(): Promise<GitHubAccount>
  /** Repositories the installation is allowed to read. */
  listRepos(): Promise<GitHubRepo[]>
  /** Imports the selected repositories. Reports incremental progress through
   *  onProgress (a live backend would stream this over SSE/WebSocket). */
  importRepos(
    repoIds: number[],
    onProgress: (statuses: RepoImportStatus[]) => void,
  ): Promise<ImportOutcome>
  disconnect(): Promise<void>
}

/* ------------------------------------------------------------------ */
/* Live client — talks to the Gityard backend (GitHub App server-side) */
/* ------------------------------------------------------------------ */

const base = () => process.env.NEXT_PUBLIC_GITYARD_GITHUB_API || "/api/github"

async function unwrap(res: Response) {
  if (!res.ok) throw new Error(`GitHub API error (${res.status})`)
  return res.json()
}

export function createHttpGitHubClient(): GitHubClient {
  return {
    mode: "live",
    getConnection: () => fetch(`${base()}/connection`).then(unwrap),
    connect: () => fetch(`${base()}/connect`, { method: "POST" }).then(unwrap),
    listRepos: () => fetch(`${base()}/repositories`).then(unwrap),
    async importRepos(repoIds, onProgress) {
      const out = await fetch(`${base()}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoIds }),
      }).then(unwrap)
      onProgress(out.statuses ?? [])
      return out
    },
    disconnect: () => fetch(`${base()}/connection`, { method: "DELETE" }).then(() => undefined),
  }
}

/* ------------------------------------------------------------------ */
/* Demo client — simulated data, clearly labeled, no real GitHub calls */
/* ------------------------------------------------------------------ */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString()

type DemoRepo = GitHubRepo & { demoFailsImport?: boolean }

/** DEMO DATA — simulated repositories. Not fetched from GitHub. */
const DEMO_REPOS: DemoRepo[] = [
  { id: 901, name: "campus-connect", fullName: "jordan-davis/campus-connect", owner: "jordan-davis", description: "Community app for students to find clubs, events, and study groups.", language: "TypeScript", visibility: "public", updatedAt: ago(3), htmlUrl: "https://github.com/jordan-davis/campus-connect", imported: false },
  { id: 902, name: "attendance-ai", fullName: "jordan-davis/attendance-ai", owner: "jordan-davis", description: "AI attendance management experiment with face grouping.", language: "Python", visibility: "private", updatedAt: ago(9), htmlUrl: "https://github.com/jordan-davis/attendance-ai", imported: false, demoFailsImport: true },
  { id: 903, name: "study-planner", fullName: "jordan-davis/study-planner", owner: "jordan-davis", description: "Planner that turns course notes into spaced-repetition sessions.", language: "TypeScript", visibility: "public", updatedAt: ago(16), htmlUrl: "https://github.com/jordan-davis/study-planner", imported: false },
  { id: 904, name: "event-checkin-qr", fullName: "jordan-davis/event-checkin-qr", owner: "jordan-davis", description: "QR based check-in terminal for campus events.", language: "JavaScript", visibility: "public", updatedAt: ago(24), htmlUrl: "https://github.com/jordan-davis/event-checkin-qr", imported: false },
  { id: 905, name: "smart-expense-vue", fullName: "jordan-davis/smart-expense-vue", owner: "jordan-davis", description: "Personal finance tool with category insights and budgets.", language: "Vue", visibility: "private", updatedAt: ago(41), htmlUrl: "https://github.com/jordan-davis/smart-expense-vue", imported: false },
  { id: 906, name: "portfolio-site", fullName: "jordan-davis/portfolio-site", owner: "jordan-davis", description: "Personal portfolio and blog.", language: "HTML", visibility: "public", updatedAt: ago(60), htmlUrl: "https://github.com/jordan-davis/portfolio-site", imported: false },
  { id: 907, name: "ml-course-notes", fullName: "jordan-davis/ml-course-notes", owner: "jordan-davis", description: "Notebooks and notes from an ML course.", language: "Jupyter Notebook", visibility: "private", updatedAt: ago(88), htmlUrl: "https://github.com/jordan-davis/ml-course-notes", imported: false },
  { id: 908, name: "dotfiles", fullName: "jordan-davis/dotfiles", owner: "jordan-davis", description: "Shell and editor configuration.", language: "Shell", visibility: "public", updatedAt: ago(120), htmlUrl: "https://github.com/jordan-davis/dotfiles", imported: false },
]

/** DEMO ACCOUNT — simulated user. Not fetched from GitHub. */
const DEMO_ACCOUNT: GitHubAccount = { login: "jordan-davis", name: "Jordan Davis", avatarUrl: null }

export function createDemoGitHubClient(): GitHubClient {
  let connected = false
  return {
    mode: "demo",
    async getConnection() {
      await delay(250)
      return { status: connected ? "connected" : "not_connected", account: connected ? DEMO_ACCOUNT : null, installationId: connected ? 1234567 : null }
    },
    async connect() {
      // Demo mode: simulates the tail end of the GitHub App install flow.
      await delay(900)
      connected = true
      return DEMO_ACCOUNT
    },
    async listRepos() {
      await delay(700)
      if (!connected) throw new Error("Not connected")
      return DEMO_REPOS.map((r) => ({ ...r }))
    },
    async importRepos(repoIds, onProgress) {
      const chosen = DEMO_REPOS.filter((r) => repoIds.includes(r.id))
      const statuses: RepoImportStatus[] = chosen.map((r) => ({ repoId: r.id, name: r.name, state: "queued", stage: 0 }))
      const push = () => onProgress(statuses.map((s) => ({ ...s })))

      await delay(800) // stage 0 — connecting to GitHub (global)
      push()
      const succeeded: GitHubRepo[] = []
      const failed: ImportOutcome["failed"] = []

      for (const repo of chosen) {
        const s = statuses.find((x) => x.repoId === repo.id)!
        s.state = "running"
        for (let stage = 1; stage < IMPORT_STAGES.length; stage++) {
          s.stage = stage
          push()
          await delay(340 + Math.random() * 380)
          // DEMO: one repository deliberately fails so the failure state can
          // be demonstrated. The reason is clearly marked as simulated.
          if (repo.demoFailsImport && stage === 4) {
            s.state = "failed"
            s.error = "[Demo] Simulated failure — request timed out while analyzing README.md"
            break
          }
        }
        if (s.state !== "failed") {
          s.state = "done"
          repo.imported = true
          succeeded.push({ ...repo })
        } else {
          failed.push({ name: repo.name, reason: s.error ?? "Unknown error" })
        }
        push()
      }
      return { succeeded, failed }
    },
    async disconnect() {
      await delay(300)
      connected = false
    },
  }
}

/* ------------------------------------------------------------------ */

let demoSingleton: GitHubClient | null = null

/** Returns the live backend client when NEXT_PUBLIC_GITYARD_GITHUB_API is set,
 *  otherwise the clearly-labeled demo client. */
export function getGitHubClient(): GitHubClient {
  if (process.env.NEXT_PUBLIC_GITYARD_GITHUB_API) return createHttpGitHubClient()
  demoSingleton ??= createDemoGitHubClient()
  return demoSingleton
}
