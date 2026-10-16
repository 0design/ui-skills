# Add Google and GitHub accounts with Better Auth

## Status and objective

- Branch: `feat/auth`
- Status: TODO
- Planned against: `3434a76`, 2026-10-16
- Scope: account foundation only; do not implement paid features yet.
- Stack: existing Astro + React + Cloudflare Worker, Better Auth, Drizzle, D1.

Provide Google and GitHub sign-in, persistent sessions, sign-out, a protected account page, explicit provider linking, and account deletion. Public browsing and skill installation remain account-free. Keep stable application user IDs so future saved skills, collections, and Stripe entitlements can reference them without using an email address or provider username as a primary key.

This file is a plan, not authorization to deploy, provision remote resources, or configure provider accounts. Do not commit or push implementation changes without a separate request.

## Existing architecture and constraints

- `package.json`: Astro 7.3.2, `@astrojs/cloudflare` 14.3.1, React 19.3.0; npm scripts for typecheck, tests, build, and smoke tests. No auth library, database driver, or ORM is currently installed.
- `astro.config.mjs`: `output: "server"`, `session: false`, Cloudflare adapter. Many public pages explicitly set `prerender = true`. Keep Astro sessions disabled: Better Auth owns user sessions.
- `wrangler.jsonc`: `nodejs_compat`, asset binding `ASSETS`, explicit `assets.run_worker_first` entries. No D1 binding currently exists. Confirm the generated deployment config in `dist/server/wrangler.json` preserves new bindings and route rules.
- `src/env.d.ts`: declares `cloudflare:workers` environment bindings. Extend the current declaration instead of creating a conflicting second one. Use the installed Cloudflare D1 types; do not hand-roll a fake database interface.
- `src/pages/jobs/post.astro`: existing example of request-time `import { env } from "cloudflare:workers"`. Follow the adapter's current convention, not obsolete `Astro.locals.runtime` examples.
- `src/layouts/Layout.astro`: shared navigation and metadata for prerendered and dynamic pages. Never put a user's name, email, or session in shared prerendered HTML.
- `src/middleware.ts`: discovery headers, security headers, trailing-slash redirects, cache headers, and HTML-to-Markdown negotiation. Preserve the existing behavior on public routes.
- `src/lib/cache-headers.ts`: public HTML caching. Auth responses and account pages must never receive public caching.
- `/oauth/*`, `/.well-known/*`, `/auth.md`, and `/mcp`: existing public agent discovery/authorization interfaces. They are NOT website user login; do not replace or require sign-in for them.
- `.gitignore` already ignores `.dev.vars` and allows `.dev.vars.example`. Secrets belong in Worker secrets and ignored local files, never `PUBLIC_*` variables.
- UI rules: existing semantic tokens, shared Button and Base UI primitives, sentence-case labels, current typography, minimal decoration. Follow the current navigation layout; do not redesign the header.

Before implementation, run `git diff --stat 3434a76..HEAD` and review changes to these files. Preserve unrelated work.

## Boundaries

### In scope

- `package.json`, lockfile: compatible pinned auth/database dependencies and local migration commands.
- `wrangler.jsonc`, `src/env.d.ts`, `.dev.vars.example`.
- `drizzle.config.ts`, `src/db/schema.ts`, versioned SQL migration files and necessary generated migration metadata.
- `src/lib/auth.ts`: request-scoped server factory using the D1 binding.
- `src/lib/auth-client.ts`: browser client only; no server imports or secrets.
- A small pure auth-options module if required to share configuration with schema generation without importing `cloudflare:workers` in Node tooling.
- `src/pages/api/auth/[...all].ts`, `src/pages/login.astro`, `src/pages/account/index.astro`.
- `src/ui/auth-nav.tsx`, `src/ui/sign-in.tsx`, `src/ui/account-settings.tsx`, and focused existing primitive changes only if needed.
- `src/layouts/Layout.astro`, `src/middleware.ts`, `src/lib/cache-headers.ts`.
- Auth tests, narrowly scoped cache/middleware tests, and smoke-test additions.
- `docs/auth.md`, plus a README link to the setup guide.

### Out of scope

Stripe, subscriptions, paid plans, role hierarchies, organizations, passwords, magic links, email delivery, Google One Tap, social profile enrichment, bookmarks, collections, following authors, and rewriting the site. No new KV, Durable Object, or external auth service unless the D1 compatibility spike establishes a concrete blocker and the maintainer approves a revised plan.

## Architecture decisions

1. **One D1 database, Drizzle SQLite adapter.** Store Better Auth users, provider accounts, sessions, verification records, and database-backed rate-limit records. Include generated indexes, unique constraints, and foreign keys. Never migrate automatically inside a request.
2. **Request-scoped server initialization.** Construct the adapter from the current request's D1 binding. Do not retain request-bound database objects in module-global state. Public prerender builds must not require production secrets or a live database.
3. **Same-origin API.** Mount Better Auth at `/api/auth/*`, with `prerender = false`, forwarding the original request to its handler. Preserve multiple `Set-Cookie` headers and redirects through middleware.
4. **No blanket session middleware.** Resolve and authorize sessions on `/account` and future protected APIs. The header uses a small client island to resolve its own session after hydration; server-render a stable signed-out/neutral state on public pages. Avoid D1 reads for every catalog page.
5. **Canonical production origin:** `https://www.ui-skills.com`. Local origin: `http://localhost:4321`. Use explicit environment-specific `baseURL` and exact trusted origins. Do not infer the auth origin from an arbitrary Host header, use wildcard trusted preview domains, or share cookies across all subdomains.
6. **No implicit account merging.** Configure Better Auth to disable implicit same-email linking while allowing authenticated users to link Google/GitHub explicitly. Do not force providers into a trusted list that bypasses email verification. A same-email sign-in through an unlinked provider should explain that the user must sign in with their original provider and link the other from account settings.
7. **Session security.** Use Better Auth's managed HttpOnly cookies, secure production settings, and compatible SameSite policy. Start with a 7-day session lifetime and 1-day refresh interval if supported by the pinned version. Keep database-backed validation for account mutations; do not rely on a client hook or stale cookie cache for authorization.
8. **Least-privilege scopes.** Google identity only: OpenID, email, profile. GitHub profile/email only, including private-email access needed by the provider. No repository, organization, Drive, or Gmail permissions. Use the library's supported token encryption setting if retaining OAuth tokens; do not expose tokens in account responses or logs.
9. **Distributed rate limiting.** Use supported database-backed Better Auth limits, not process-local memory. Trust Cloudflare's `CF-Connecting-IP` in deployed requests, not arbitrary forwarded IP chains. Choose bounded auth limits after testing callbacks, normal sign-in, and header session fetches.
10. **Default public development still works.** Imports, typecheck, tests, builds, and browsing must work without OAuth credentials. Only initialize auth in the relevant request path. Missing runtime auth configuration should produce a clear, safe unavailable state/503, not a fake successful login or a public-site crash. Document which variables are required to enable auth in production.

## Implementation sequence

### 1. Prove the Worker/D1 compatibility first

- Inspect current Better Auth, Drizzle, adapter, CLI, and Wrangler versions; choose compatible stable versions and commit the lockfile. Current docs show a separate `@better-auth/drizzle-adapter` package: verify the export for the selected version rather than copying an older import.
- Add the D1 binding named `AUTH_DB` and explicit Worker routing for `/api/auth/*`, `/login`, `/account`, and `/account/*`.
- Generate the Better Auth schema with the selected configuration, including database rate limits. Keep schema-generation configuration Node-compatible; it must not import a runtime Cloudflare module or require production secrets.
- Generate reviewed SQLite migrations through Drizzle and apply them with Wrangler to LOCAL D1 only. Add clear npm scripts for generating migrations and applying local/remote migrations; the remote command must be explicit and never part of `build`.
- Exercise session and verification writes under workerd/local D1. Check the adapter's D1 transaction limitations and supported configuration. Do not use unsupported `BEGIN`/`COMMIT`, monkey-patch the driver, or assume a Node SQLite test proves D1 compatibility. Account for partial failure if operations are non-transactional; unique constraints must prevent duplicate provider identities.

**Gate:** local migrations apply on a fresh database and can be rerun without duplicate application; an auth handler request runs against the real local D1 binding without transaction/runtime errors. Stop here if the selected adapter cannot support the needed operations cleanly.

### 2. Configure providers and the auth handler

- Implement a server factory in `src/lib/auth.ts`, with explicitly typed bindings and server-only configuration.
- Configure Google/GitHub, safe origins, cookies, account-linking policy, session lifetime, token handling, and database rate limits.
- Add the Better Auth catch-all handler with `export const prerender = false` and the documented Astro `ALL` handler.
- Use immutable application user IDs. Provider account IDs and email changes must not change that ID.
- Add typed nullable user/session locals only if the account page or scoped middleware uses them. Never fetch a session during prerendering.

**Gate:** mocked OAuth tests and real-D1 integration tests can create/reuse a user, issue a session, resolve it, and revoke it; duplicate provider callbacks do not create duplicate identities. Requests from untrusted origins are rejected by the library's checks.

### 3. Protect routing, caching, and existing public interfaces

- Return `Cache-Control: private, no-store` for all auth endpoints, redirects, account responses, failures, and any response that sets session/state cookies. Add any CDN-specific cache override required by the deployed configuration.
- Exclude `/api/auth/*` from general trailing-slash canonicalization and Markdown conversion; callbacks must reach Better Auth unchanged. Protected account routes must not be converted to Markdown or exposed by public content negotiation.
- Ensure middleware never replaces private caching with public cache headers and never collapses multiple cookies into one invalid header. Add a cookie-safe response-header pattern only if the existing `new Headers()`/Response cloning is insufficient under workerd.
- Require a valid server session before rendering `/account`. Redirect anonymous visitors to `/login` with a validated relative return path; reject external, protocol-relative, encoded, and malformed callback targets.
- Preserve public agent OAuth, MCP, discovery, and current catalog caching. Check that existing jobs forms continue working with the CSP. Standard OAuth uses top-level navigation: do not broadly loosen CSP or enable cross-origin API access to make login work.
- Keep login/account pages out of the sitemap and add `noindex, nofollow` metadata.

**Gate:** cache tests prove auth/account responses are private even with cookies, errors, redirects, or Markdown Accept headers; existing public cache/OAuth/MCP tests still pass.

### 4. Add minimal account UI

- `/login`: reuse Layout and existing buttons; “Continue with Google” and “Continue with GitHub”, pending state, cancellation handling, inline errors, and a clear back-to-browsing action. No passwords, provider SDK scripts, One Tap, or extra scopes.
- Header island: signed-out “Sign in”; signed-in account link/menu and sign-out. Keep it usable on mobile, keyboard-accessible, and stable during hydration. Use existing primitives for menus; never hand-roll focus management. Auth scripts must not pull server configuration into the client bundle.
- `/account`: show name/email/avatar from the authenticated identity, linked providers, explicit connect actions for the missing provider, sign-out, and account deletion. Keep provider linking scoped to the signed-in user and handle `account_not_linked` helpfully.
- Do not offer unlinking in this first phase, avoiding accidental removal of the last login method.
- Account deletion uses an existing accessible confirmation dialog, a fresh-auth requirement enforced on the server, and cleanup of sessions/provider records. Do not claim that deleting the local account revokes provider permissions unless implemented and verified.
- Handle provider failure, missing verified email, denied consent, unavailable configuration, expired sessions, failed account linking, and failed deletion without leaking raw provider errors or secrets. Do not invent fake emails for GitHub accounts.

**Gate:** Google and GitHub flows both work end-to-end locally with real test-provider credentials; a cancelled flow returns a usable login page; explicit linking preserves the same application user ID; sign-out and deletion revoke server access immediately.

### 5. Document configuration and deployment

Create `.dev.vars.example` containing placeholders only:

```dotenv
BETTER_AUTH_URL=http://localhost:4321
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

`AUTH_DB` is a Worker binding, not a database URL or browser variable. Generate a high-entropy Better Auth secret using the selected library's documented requirements. Use distinct dev/staging/production secrets, D1 databases, and provider applications where needed.

Document these callback URLs exactly:

| Provider | Local | Production |
| --- | --- | --- |
| Google | `http://localhost:4321/api/auth/callback/google` | `https://www.ui-skills.com/api/auth/callback/google` |
| GitHub | `http://localhost:4321/api/auth/callback/github` | `https://www.ui-skills.com/api/auth/callback/github` |

- GitHub OAuth Apps have a single configured callback URL: use separate local/production apps. Request only identity/email scopes.
- Configure Google's consent screen, test users/publishing status, authorized origins as required, and exact redirects. Do not request restricted API scopes.
- Keep auth disabled on unconfigured previews; do not point arbitrary preview hosts at production sessions or credentials. Use one explicitly configured staging origin for real staging tests.
- Document local D1 migrations, provider setup, Worker secrets, explicit production migration/deployment order, account-linking policy, account deletion, and recovery limitations.
- No remote database creation, remote migrations, secret upload, OAuth-console changes, or deployment without maintainer approval.

## Tests and verification

Use the repository's `node:test` + `assert/strict` style (`tests/routes.test.ts`, `tests/cache-headers.test.ts`, `tests/oauth-validation.test.ts`). Add a workerd/D1 integration test harness only as needed, keeping unit tests runnable without external credentials. Do not make tests depend on Google's or GitHub's live services.

Cover:

- Google/GitHub provider configuration, minimal scopes, exact origins, and no email/password endpoint.
- Session creation, existing-user sign-in, expiry, refresh, sign-out, and fresh-auth-gated deletion.
- Explicit account linking, same-email unlinked-provider rejection, duplicate provider identity protection, and unverifiable/missing-email failures.
- Private cache headers and separate cookies on success, errors, and OAuth redirects.
- External redirect rejection, forged OAuth state, callback replay, provider cancellation, and trusted-origin enforcement using Better Auth's supported test interfaces.
- Protected `/account` server access, not merely hidden client UI.
- No eager database initialization for public/static pages; public build works without `.dev.vars` or production secrets.
- Existing OAuth/discovery/MCP endpoints remain public and public cache policies remain unchanged.
- Database-backed auth rate limits, including repeated abuse and callback compatibility.

Commands and expected results:

| Command | Expected result |
| --- | --- |
| `npm run typecheck` | Exit 0, no errors; existing deprecation hints need not be changed. |
| `npm test` | All existing and new tests pass without external OAuth credentials. |
| Local D1 integration command added in step 1 | Real local D1/workerd flows pass. |
| `npm run build` | Static prerender and Worker build pass without production auth credentials; inspect generated Worker routing/bindings. |
| `npm run smoke` | Existing route smoke checks plus auth route/no-store assertions pass. |
| `git diff --check` | No whitespace errors. |

Existing external skill checks have previously reported ten upstream 404s unrelated to auth. If still present, report them separately; do not alter registry content to make an auth change pass. A passing mock provider test is not evidence of a real Google/GitHub flow: record manual provider tests separately as passed, failed, or blocked by missing credentials.

## Done criteria and rollout

- Both providers work with explicitly configured local and staging credentials.
- Public pages still build and load with no credentials or auth database access.
- Auth/account routes are dynamic, no-store, noindex, and routed to the Worker.
- No session/profile data appears in another user's HTML, cached responses, client bundle, analytics payloads, or logs.
- A user can link their second provider explicitly and retains their original application ID.
- Signed-out/deleted sessions cannot authorize protected requests.
- No changes to the existing public agent OAuth/MCP contract.
- Dependencies, schema, SQL migrations, setup docs, tests, and configuration examples are committed together when the maintainer requests a commit.
- Deployment remains blocked until the maintainer provisions isolated D1 environments, configures OAuth applications/secrets, approves remote migrations, and confirms the staging flows.

## Stop conditions

- Installed adapter/Better Auth versions cannot run correctly on D1/workerd, or require unsupported SQL transactions for essential flows.
- Auth imports make public builds require production secrets or database bindings.
- Asset routing bypasses the auth handler, or a session/state response can be publicly cached.
- Account linking requires bypassing verified identity checks, or requested redirects cannot be constrained safely.
- The task expands into payment, paid access, organizations, or a replacement for public agent OAuth.
- Remote setup or provider-console access is required: report the precise manual step rather than silently deploying or requesting broad credentials.

## References checked during planning

- https://www.better-auth.com/docs/integrations/astro
- https://www.better-auth.com/docs/adapters/drizzle
- https://www.better-auth.com/docs/authentication/google
- https://www.better-auth.com/docs/authentication/github
- https://www.better-auth.com/docs/concepts/users-accounts
- https://www.better-auth.com/docs/concepts/rate-limit
- https://developers.cloudflare.com/d1/

Recheck version-specific options when implementing. In particular, do not copy legacy account-linking, rate-limit, adapter-import, or Cloudflare binding APIs without checking the installed versions.
