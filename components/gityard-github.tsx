"use client"
// Gityard GitHub integration — connection, repository selection and import
// screens. Follows the existing Gityard dark UI (see app/globals.css .gh-*).
//
// When no backend is configured (no NEXT_PUBLIC_GITYARD_GITHUB_API) every
// screen runs in demo mode with simulated data, always labeled "DEMO".
// Nothing here fakes a real GitHub connection.

import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Clock3,
  LoaderCircle,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
  Unplug,
  X,
} from "lucide-react"
import {
  IMPORT_STAGES,
  getGitHubClient,
  type GitHubAccount,
  type GitHubRepo,
  type ImportOutcome,
  type RepoImportStatus,
} from "@/lib/github"

const cx = (...x: (string | false)[]) => x.filter(Boolean).join(" ")

/* GitHub mark (octicon, MIT licensed) — brand icons are not in lucide. */
export function GitHubMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Vue: "#41b883",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Go: "#00ADD8",
  Rust: "#dea584",
  "Jupyter Notebook": "#DA5B0B",
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? "1 month ago" : `${months} months ago`
}

function DemoBadge() {
  return <span className="gh-demo-badge" title="Demo mode — simulated data, no GitHub account is contacted">DEMO DATA</span>
}

function Avatar({ account, size = 34 }: { account: GitHubAccount; size?: number }) {
  if (account.avatarUrl)
    return <img className="gh-avatar" src={account.avatarUrl} alt={`@${account.login}`} width={size} height={size} />
  const initials = account.name.split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase()
  return <span className="gh-avatar" style={{ width: size, height: size, fontSize: size * 0.34 }}>{initials}</span>
}

/* ------------------------------------------------------------------ */
/* Screen 1 — connection                                               */
/* ------------------------------------------------------------------ */

function ConnectionScreen({
  account,
  demo,
  connecting,
  onConnect,
  onManage,
  onDisconnect,
}: {
  account: GitHubAccount | null
  demo: boolean
  connecting: boolean
  onConnect: () => void
  onManage: () => void
  onDisconnect: () => void
}) {
  if (!account)
    return (
      <div className="gh-connect-card gh-fade">
        <span className="gh-mark gh-mark-lg"><GitHubMark size={26} /></span>
        <h3>Why connect GitHub?</h3>
        <p className="gh-connect-copy">
          Gityard turns your dormant repositories into project memory. Connecting GitHub lets you
          import your repositories, understand what was left unfinished, and rediscover reusable code
          across everything you have ever built.
        </p>
        <ul className="gh-perms">
          <li><ShieldCheck size={14} /> Repository metadata — read only</li>
          <li><ShieldCheck size={14} /> Repository contents (README &amp; structure) — read only</li>
          <li className="denied"><X size={14} /> No write access — Gityard can never push, edit, or delete</li>
        </ul>
        <p className="gh-connect-copy small">
          You choose which repositories Gityard can access during the GitHub App installation,
          and you can revoke access at any time — from GitHub or right here in Settings.
        </p>
        <button className="button button-primary gh-connect-cta" onClick={onConnect} disabled={connecting}>
          {connecting ? <LoaderCircle className="spin" size={15} /> : <GitHubMark size={14} />}
          {connecting ? "Connecting…" : "Connect GitHub"}
        </button>
        {demo && <p className="gh-note">Demo mode — the connection is simulated. No GitHub account is contacted.</p>}
        <p className="gh-privacy"><Lock size={12} /> Your credentials stay between you and GitHub. Gityard never asks for passwords or personal access tokens.</p>
      </div>
    )

  return (
    <div className="gh-connect-card connected gh-fade">
      <div className="gh-connected-head">
        <Avatar account={account} size={40} />
        <div className="gh-connected-id">
          <strong>{account.name}</strong>
          <span>@{account.login}</span>
        </div>
        <span className="gh-status-pill"><i />Connected</span>
      </div>
      <p className="gh-connect-copy">
        Your GitHub account is linked through a Gityard GitHub App with read-only permissions.
        Choose which repositories to bring into your archive.
      </p>
      <div className="gh-connected-actions">
        <button className="button button-primary" onClick={onManage}><GitHubMark size={13} /> Manage repositories</button>
        <button className="button button-ghost" onClick={onDisconnect}><Unplug size={14} /> Disconnect GitHub</button>
      </div>
      {demo && <p className="gh-note">Demo mode — account and repositories below are simulated.</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Screen 2 — repository selection                                     */
/* ------------------------------------------------------------------ */

type PickerState = {
  repos: GitHubRepo[] | null
  error: string | null
}

function RepoPicker({
  importedIds,
  onCancel,
  onImport,
  onReposLoaded,
}: {
  importedIds: number[]
  onCancel: () => void
  onImport: (ids: number[]) => void
  onReposLoaded: (count: number) => void
}) {
  const client = useMemo(() => getGitHubClient(), [])
  const [state, setState] = useState<PickerState>({ repos: null, error: null })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [query, setQuery] = useState("")
  const [lang, setLang] = useState("All languages")
  const [vis, setVis] = useState("All")
  const [sort, setSort] = useState("Last updated")

  const load = () => {
    setState({ repos: null, error: null })
    client
      .listRepos()
      .then((repos) => {
        setState({ repos, error: null })
        onReposLoaded(repos.length)
      })
      .catch((e) => setState({ repos: null, error: e?.message || "Could not load repositories" }))
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.error)
    return (
      <div className="gh-state gh-fade">
        <span className="gh-state-icon error"><TriangleAlert size={20} /></span>
        <h3>Couldn’t load your repositories</h3>
        <p>{state.error}</p>
        <div className="gh-state-actions">
          <button className="button button-secondary" onClick={load}><RefreshCw size={13} /> Try again</button>
          <button className="button button-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    )

  if (!state.repos)
    return (
      <div className="gh-fade" aria-busy="true" aria-label="Loading repositories">
        <div className="gh-select-bar"><span className="gh-muted">Loading repositories…</span></div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div className="gh-repo-row skeleton" key={i}>
            <span className="gh-check" />
            <div className="gh-repo-main"><span className="gh-skel-line w40" /><span className="gh-skel-line w80" /></div>
            <span className="gh-skel-line w20" />
          </div>
        ))}
      </div>
    )

  const languages = [...new Set(state.repos.map((r) => r.language).filter(Boolean))] as string[]
  const filtered = state.repos
    .map((r) => ({ ...r, imported: r.imported || importedIds.includes(r.id) }))
    .filter(
      (r) =>
        (lang === "All languages" || r.language === lang) &&
        (vis === "All" || (vis === "Public" ? r.visibility === "public" : r.visibility === "private")) &&
        (!query || `${r.fullName} ${r.description ?? ""} ${r.language ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    )
    .sort((a, b) =>
      sort === "Repository name"
        ? a.fullName.localeCompare(b.fullName)
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )

  const selectable = filtered.filter((r) => !r.imported)
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id))
  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s)
      if (allSelected) selectable.forEach((r) => n.delete(r.id))
      else selectable.forEach((r) => n.add(r.id))
      return n
    })

  return (
    <div className="gh-picker gh-fade">
      <div className="gh-repo-toolbar">
        <div className="gh-search">
          <Search size={13} />
          <input aria-label="Search repositories" placeholder="Search repositories…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <label className="select-wrap" aria-label="Filter by language">
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option>All languages</option>
            {languages.map((l) => <option key={l}>{l}</option>)}
          </select>
          <ChevronDown size={12} />
        </label>
        <label className="select-wrap" aria-label="Filter by visibility">
          <select value={vis} onChange={(e) => setVis(e.target.value)}>
            <option>All</option><option>Public</option><option>Private</option>
          </select>
          <ChevronDown size={12} />
        </label>
        <label className="select-wrap" aria-label="Sort repositories">
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option>Last updated</option><option>Repository name</option>
          </select>
          <ChevronDown size={12} />
        </label>
      </div>

      <div className="gh-select-bar">
        <button className="gh-select-all" onClick={toggleAll} disabled={selectable.length === 0}>
          <span className={cx("gh-check", allSelected && "checked")}>{allSelected && <Check size={10} />}</span>
          {allSelected ? "Clear selection" : "Select all"}
        </button>
        <span className="gh-muted">{selected.size} selected</span>
      </div>

      {state.repos.length === 0 ? (
        <div className="gh-state">
          <span className="gh-state-icon"><GitHubMark size={18} /></span>
          <h3>No repositories to import</h3>
          <p>Your GitHub App installation doesn’t currently have access to any repositories. You can adjust repository access from GitHub → Settings → Applications.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="gh-state">
          <span className="gh-state-icon"><Search size={18} /></span>
          <h3>No repositories match</h3>
          <p>Try a different search or clear the language and visibility filters.</p>
          <button className="button button-secondary" onClick={() => { setQuery(""); setLang("All languages"); setVis("All") }}>Clear filters</button>
        </div>
      ) : (
        <div className="gh-repo-list">
          {filtered.map((r) => (
            <div className={cx("gh-repo-row", r.imported && "imported")} key={r.id}>
              <button
                className={cx("gh-check", selected.has(r.id) && "checked")}
                disabled={r.imported}
                aria-label={`Select ${r.fullName}`}
                aria-pressed={selected.has(r.id)}
                onClick={() => toggle(r.id)}
              >
                {selected.has(r.id) && <Check size={11} />}
              </button>
              <div className="gh-repo-main">
                <div className="gh-repo-name">
                  <strong>{r.fullName}</strong>
                  <span className={cx("gh-vis", r.visibility)}>{r.visibility}</span>
                  {r.imported && <span className="gh-imported-badge"><Check size={9} /> Imported</span>}
                </div>
                <p>{r.description || "No description provided."}</p>
              </div>
              <div className="gh-repo-meta">
                {r.language && <span><i style={{ background: LANG_COLORS[r.language] ?? "#8b8794" }} />{r.language}</span>}
                <span><Clock3 size={11} /> {timeAgo(r.updatedAt)}</span>
              </div>
              <a className="gh-repo-link" href={r.htmlUrl} target="_blank" rel="noreferrer" aria-label={`Open ${r.fullName} on GitHub`}>
                <ArrowUpRight size={13} />
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="gh-picker-actions">
        <button className="button button-ghost" onClick={onCancel}>Cancel</button>
        <button className="button button-primary" disabled={selected.size === 0} onClick={() => onImport([...selected])}>
          Import {selected.size > 0 ? `${selected.size} ` : ""}selected {selected.size === 1 ? "repository" : "repositories"}
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Screen 3 — import progress                                          */
/* ------------------------------------------------------------------ */

function ImportProgress({ statuses }: { statuses: RepoImportStatus[] }) {
  const running = statuses.find((s) => s.state === "running")
  const allQueued = statuses.length === 0 || statuses.every((s) => s.state === "queued")
  const stage = allQueued ? 0 : running ? running.stage : IMPORT_STAGES.length
  const finished = statuses.filter((s) => s.state === "done" || s.state === "failed").length
  const pct = statuses.length ? Math.round((finished / statuses.length) * 100) : 0

  return (
    <div className="gh-import gh-fade">
      <div className="gh-import-card">
        <div className="gh-progress-head">
          <strong>{finished === statuses.length && statuses.length > 0 ? "Finishing up…" : "Importing repositories…"}</strong>
          <span>{finished}/{statuses.length}</span>
        </div>
        <div className="gh-progress-track"><i style={{ width: `${pct}%` }} /></div>
        <ol className="gh-stages">
          {IMPORT_STAGES.map((s, i) => (
            <li key={s.id} className={cx(i < stage && "done", i === stage && i < IMPORT_STAGES.length && "current")}>
              <span className="gh-stage-icon">
                {i < stage ? <Check size={10} /> : i === stage ? <LoaderCircle className="spin" size={11} /> : null}
              </span>
              {s.label}
            </li>
          ))}
        </ol>
      </div>
      <div className="gh-import-repos">
        {statuses.map((s) => (
          <div className={cx("gh-repo-status", s.state)} key={s.repoId}>
            <span className="gh-repo-status-icon">
              {s.state === "done" ? <Check size={11} /> : s.state === "failed" ? <X size={11} /> : s.state === "running" ? <LoaderCircle className="spin" size={11} /> : <Clock3 size={10} />}
            </span>
            <strong>{s.name}</strong>
            <span className="gh-repo-status-label">{s.state === "done" ? "Imported" : s.state === "failed" ? s.error : s.state === "queued" ? "Waiting" : IMPORT_STAGES[s.stage]?.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Screen 4 — import summary                                           */
/* ------------------------------------------------------------------ */

function ImportSummary({ outcome, onViewProjects, onMore }: { outcome: ImportOutcome; onViewProjects: () => void; onMore: () => void }) {
  return (
    <div className="gh-summary gh-fade">
      {outcome.succeeded.length > 0 && (
        <div className="gh-summary-card ok">
          <span className="gh-summary-icon"><CheckCheck size={17} /></span>
          <div>
            <strong>{outcome.succeeded.length} {outcome.succeeded.length === 1 ? "repository imported" : "repositories imported"}</strong>
            <p>{outcome.succeeded.map((r) => r.fullName).join(" · ")}</p>
          </div>
        </div>
      )}
      {outcome.failed.length > 0 && (
        <div className="gh-summary-card fail">
          <span className="gh-summary-icon"><TriangleAlert size={17} /></span>
          <div>
            <strong>{outcome.failed.length} {outcome.failed.length === 1 ? "import failed" : "imports failed"}</strong>
            {outcome.failed.map((f) => <p key={f.name}><b>{f.name}</b> — {f.reason}</p>)}
          </div>
        </div>
      )}
      <div className="gh-summary-actions">
        <button className="button button-primary" onClick={onViewProjects}>View projects <ArrowRight size={13} /></button>
        <button className="button button-secondary" onClick={onMore}>Import more repositories</button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Flow orchestration                                                  */
/* ------------------------------------------------------------------ */

export type GitHubFlowProps = {
  account: GitHubAccount | null
  importedIds: number[]
  onConnected: (account: GitHubAccount) => void
  onDisconnected: () => void
  onImported: (repos: GitHubRepo[]) => void
  onReposLoaded: (count: number) => void
  go: (page: string) => void
  notify: (message: string) => void
}

export default function GitHubFlow({ account, importedIds, onConnected, onDisconnected, onImported, onReposLoaded, go, notify }: GitHubFlowProps) {
  const client = useMemo(() => getGitHubClient(), [])
  const [screen, setScreen] = useState<"connect" | "select" | "importing" | "summary">("connect")
  const [connecting, setConnecting] = useState(false)
  const [statuses, setStatuses] = useState<RepoImportStatus[]>([])
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  const demo = client.mode === "demo"

  // Restore an existing session (e.g. after returning from the GitHub App
  // installation redirect). No-op in demo mode when not connected.
  useEffect(() => {
    let alive = true
    client
      .getConnection()
      .then((c) => {
        if (alive && c.status === "connected" && c.account) onConnected(c.account)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = () => {
    setConnecting(true)
    client
      .connect()
      .then((a) => {
        onConnected(a)
        setScreen("select")
      })
      .catch((e) => notify(e?.message || "Connection failed"))
      .finally(() => setConnecting(false))
  }

  const disconnect = () => {
    if (!confirm("Disconnect GitHub? Repositories already imported stay in your archive.")) return
    client.disconnect().catch(() => {}).finally(() => {
      onDisconnected()
      notify("GitHub disconnected")
    })
  }

  const startImport = (ids: number[]) => {
    setScreen("importing")
    setStatuses([])
    setOutcome(null)
    client
      .importRepos(ids, (s) => setStatuses([...s]))
      .then((out) => {
        setOutcome(out)
        onImported(out.succeeded)
        setScreen("summary")
        notify(out.failed.length ? `Imported ${out.succeeded.length} · failed ${out.failed.length}` : "Repositories imported to your archive")
      })
      .catch((e) => {
        notify(e?.message || "Import failed")
        setScreen("select")
      })
  }

  return (
    <div className="gh-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="live-dot" /> GITHUB INTEGRATION</div>
          <h1>Connect GitHub<span className="period">.</span></h1>
          <p>Bring your repositories into Gityard and turn dormant code into reusable building blocks.</p>
        </div>
        {demo ? <DemoBadge /> : <span className="gh-live-badge"><i /> Live</span>}
      </div>

      {screen === "connect" && (
        <ConnectionScreen
          account={account}
          demo={demo}
          connecting={connecting}
          onConnect={connect}
          onManage={() => setScreen("select")}
          onDisconnect={disconnect}
        />
      )}
      {screen === "select" && (
        <RepoPicker importedIds={importedIds} onCancel={() => setScreen("connect")} onImport={startImport} onReposLoaded={onReposLoaded} />
      )}
      {screen === "importing" && <ImportProgress statuses={statuses} />}
      {screen === "summary" && outcome && (
        <ImportSummary outcome={outcome} onViewProjects={() => go("archive")} onMore={() => setScreen("select")} />
      )}
    </div>
  )
}
