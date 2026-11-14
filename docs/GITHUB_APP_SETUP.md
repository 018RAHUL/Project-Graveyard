# Connecting Gityard to real GitHub data

Gityard integrates through a **GitHub App** with least-privilege, read-only
permissions. The browser never sees any secret: the App's private key stays on
the server and is only used to mint short-lived installation tokens.

## What users get

- **Read-only** access to repository **metadata**, **contents** (README,
  file tree, `package.json`) — never any write permission.
- They **choose which repositories** Gityard can access during installation
  (all repositories or a selected subset).
- They can **revoke access at any time** from GitHub
  (Settings → Applications → Installed GitHub Apps) or disconnect from
  Gityard's Settings.

## 1. Create the GitHub App

1. Go to <https://github.com/settings/apps/new> (personal) or your
   organization's Settings → Developer settings → GitHub Apps → **New GitHub App**.
2. Fill in:
   - **GitHub App name** — e.g. `gityard`
   - **Homepage URL** — your app's public URL
     (for local dev use your tunnel URL, e.g. `https://gityard.ngrok.app`)
   - **Callback URL** — `https://<your-domain>/api/github/callback`
     (only needed if you later add user OAuth; the install flow uses the Setup URL)
   - **Setup URL** — `https://<your-domain>/api/github/callback`
     ← this is where GitHub redirects right after installation
   - Uncheck **"Active"** (webhooks) or leave the webhook field as-is — Gityard
     does not process webhooks.
3. **Permissions → Repository permissions:**
   - Administration: **No access**
   - Contents: **Read-only**
   - Metadata: **Read-only** (mandatory, automatic)
   - Everything else: No access
4. **Where can this app be installed?** — Any account (or restrict as you like).
5. Create the app. Note the **App ID** (numeric) shown on the app settings page
   and the **slug** from its public URL (`github.com/apps/<slug>`).
6. Scroll to **Private key → Generate a private key** and download the `.pem`.

## 2. Configure the environment

Copy `.env.example` to `.env.local` and fill in:

```bash
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=gityard
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"
APP_URL=https://gityard.ngrok.app
```

Notes:
- Multiline keys in `.env.local` must use literal `\n` escapes (or use
  `GITHUB_APP_PRIVATE_KEY_BASE64` with the base64 of the `.pem` file).
- `APP_URL` must be **publicly reachable** — GitHub's install redirect cannot
  reach `localhost`. For local development, run a tunnel
  (`ngrok http 3000` / `cloudflared tunnel --url http://localhost:3000`) and
  set the tunnel URL as `APP_URL`, in the App's **Setup URL**, and in its
  **Homepage URL**.

## 3. Run

```bash
pnpm dev
```

- Gityard automatically switches to **live mode** (the `DEMO DATA` badge
  disappears) when `NEXT_PUBLIC_GITYARD_GITHUB_API` is set — with the backend
  living in this same app, `NEXT_PUBLIC_GITYARD_GITHUB_API=/api/github` is all
  you need.
- Click **Connect GitHub** → you are redirected to GitHub to install the App
  and pick repositories → GitHub redirects back to `/workspace` with the
  session bound via an httpOnly cookie → your real repositories appear.

## What the import actually reads

For each selected repository the backend performs real GitHub API reads:

| Stage | Endpoint |
|---|---|
| Fetching repository information | `GET /installation/repositories` |
| Reading repository structure | repo metadata + languages |
| Analyzing README files | `GET /repos/{owner}/{repo}/readme` |
| Detecting technologies | `GET /repos/.../languages` + `package.json` dependencies |

Failures (private repo the installation can't see, rate limit, network) are
reported per repository with the real error — nothing is faked.

## Security notes

- Private key and installation tokens exist only in server memory/env.
- Installation access tokens expire after 1 hour and are minted per request.
- The session cookie is `httpOnly`, `SameSite=Lax`, and `Secure` in production.
- The install callback verifies that the `installation_id` belongs to **this**
  App (server-side JWT check) before binding it to a session.
- The frontend client never handles credentials; it only calls
  `/api/github/*` on the same origin.
