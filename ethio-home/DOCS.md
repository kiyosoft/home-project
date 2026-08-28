# Ethio Home

Plugin-driven dashboard for Home Assistant. This add-on serves the Ethio Home web UI through **ingress** (sidebar panel). Entity traffic stays in your browser: you sign in with your Home Assistant account, and the dashboard talks to it directly.

## Installation (GitHub)

1. In Home Assistant: **Settings → Add-ons → Add-on store → ⋮ → Repositories**.
2. Add:

   ```text
   https://github.com/kiyosoft/home-project
   ```

3. Find **Ethio Home** in the store, install, and start it.
4. Open it from the sidebar (or **Open Web UI**).

The repository root contains `repository.yaml` and the `ethio-home/` add-on folder. Built UI files live in `ethio-home/www/` and are included in the repo so Supervisor can build without Node.

## Installation (local copy)

1. From the monorepo: `pnpm prepare:addon` (refreshes `ethio-home/www/`).
2. Copy `ethio-home/` into your Home Assistant local add-ons directory (for example `/addons/ethio-home` on HAOS).
3. Refresh the Add-on store, install, and start.

## First connection

1. Open Ethio Home from the sidebar. The Home Assistant URL is filled in for you.
2. Enter your Home Assistant username and password, then click **Sign in**.

Your session refreshes itself, so there is nothing to paste and nothing to rotate by hand. Two-factor accounts get a second step asking for the code.

### Long-lived access token instead

Choose **Use a long-lived access token instead** on the setup screen if you would rather not sign in:

1. In Home Assistant: **Profile → Security → Long-lived access tokens → Create token**.
2. Enter your HA URL, paste the token, and click **Connect**.

Settings and dashboard layout are stored in the browser (`localStorage`) for that device.

## Demo mode

Use **Start demo** on the setup screen to explore sample widgets without connecting to Home Assistant.

## Updating the UI (maintainers)

After dashboard changes:

```bash
pnpm prepare:addon
git add ethio-home/www
```

Bump `version` in `ethio-home/config.yaml`, commit, push, then update the add-on in Home Assistant.

## Mobile app sign-in

Signing in from the Ethio Home mobile app needs a verification page that Home Assistant fetches to confirm the app may receive your login. That page is published by the **Et Remote Access** add-on, not this one. Install it and sign-in works on the local network and over the public URL.

## Notes

- Ingress only allows traffic from the Supervisor ingress proxy.
- Home Assistant only accepts its login API from pages it serves itself, which is why signing in works here but not from a dashboard hosted elsewhere. Use a long-lived access token in that case.
- Rebuild/reinstall after pulling UI updates that change `ethio-home/www/`.
