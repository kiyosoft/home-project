# Ethio Home (Home Assistant add-on)

Serves the Ethio Home dashboard over Home Assistant ingress.

## Install from GitHub

In Home Assistant: **Settings → Add-ons → Add-on store → ⋮ → Repositories**, add:

```text
https://github.com/kiyosoft/home-project
```

Install **Ethio Home**, start it, open from the sidebar, then connect with your HA URL and a long-lived access token.

## Refresh built UI (maintainers)

From the monorepo root (requires Node 20+ and pnpm):

```bash
pnpm prepare:addon
```

This builds the dashboard and copies `apps/dashboard/dist` into `ethio-home/www/`. Commit `www/` when publishing so GitHub installs stay current.

See [DOCS.md](./DOCS.md) for details.
