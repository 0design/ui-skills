# UI Skills

![UI Skills](./public/UI-OG.png)

Skills for Design Engineers.

More on [ui-skills.com](https://www.ui-skills.com/)

## CLI

Browse and fetch skills from your terminal.

```bash
npx ui-skills start
npx ui-skills categories
npx ui-skills list --category motion
npx ui-skills get baseline-ui
```

## MCP

Connect agents to the registry over Model Context Protocol.

```
https://www.ui-skills.com/mcp
```

Tools: `list_skills`, `get_skill`

## Playbook

Distilled UI lessons from the best design engineering skills.

[ui-skills.com/playbook](https://www.ui-skills.com/playbook)

## Accounts

Requires Node.js 22.19 or newer. See [SECURITY.md](SECURITY.md) for the auth
boundaries, reporting guidance, and deployment checks.

Google and GitHub sign-in use Better Auth and Cloudflare D1. Public pages still
work without OAuth credentials; sign-in stays unavailable until configured.

1. Copy `.dev.vars.example` to the ignored `.dev.vars` file. Set the auth values.
   Generate `BETTER_AUTH_SECRET` with `openssl rand -hex 32`.
2. Create Google and GitHub OAuth applications with these local callbacks:
   - `http://localhost:4321/api/auth/callback/google`
   - `http://localhost:4321/api/auth/callback/github`
3. Run `npm run db:migrate:local`, then `npm run dev` and visit `/login`.

For production, create a D1 database and replace the local placeholder ID in
`wrangler.jsonc`. Set `BETTER_AUTH_URL=https://www.ui-skills.com` and configure
the five credential/secret values as Cloudflare Worker secrets. Register the same
callback paths on `https://www.ui-skills.com`; use a separate GitHub OAuth app
for production. Apply migrations explicitly with `npm run db:migrate:remote`
before deploying. Never use production credentials or D1 data in local previews.

Only identity/profile and email permissions are needed—no repository or Google
Workspace access. Additional providers must be connected from `/account` while
signed in; matching email addresses are not silently merged. Account deletion,
billing, and saved skills are not included yet.

## License

Licensed under the [MIT license](https://github.com/ibelick/ui-skills/blob/main/LICENSE).
