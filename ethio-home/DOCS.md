# Ethio Home

Plugin-driven dashboard for Home Assistant. This add-on serves the Ethio Home web UI through **ingress** (sidebar panel). Entity traffic stays in your browser: you connect with a Home Assistant URL and a long-lived access token.

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

1. In Home Assistant: **Profile → Security → Long-lived access tokens → Create token**.
2. In Ethio Home setup, enter your HA URL (for example `http://homeassistant.local:8123`) and paste the token.
3. Click **Connect**.

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

## Remote access (Cloudflare Tunnel)

From **Dashboard settings → Remote access** (while the add-on is running):

- **Quick** — temporary `*.trycloudflare.com` URLs for the dashboard SPA and Home Assistant. URLs change each start.
- **Named** — paste a Cloudflare API token plus account ID, zone ID, and two hostnames. The add-on creates/updates a remotely managed tunnel, DNS CNAMEs, and runs `cloudflared`.

Secrets (API token, tunnel token) are stored under the add-on’s `/data` directory, not in the browser.

### Cloudflare API token permissions

- Account — Cloudflare Tunnel — Edit
- Zone — DNS — Edit
- Zone — Zone — Read

### Home Assistant reverse proxy

Cloudflared sends `X-Forwarded-*` headers. Add to Home Assistant `configuration.yaml` and restart:

```yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 172.30.32.0/23   # typical Supervisor / add-on network
    - 127.0.0.1
    - ::1
```

Adjust the subnet if your install differs. After a tunnel starts, use **Use HA tunnel URL in connection** (or paste the HA URL on the setup screen) with your long-lived access token.

## Notes

- Ingress only allows traffic from the Supervisor ingress proxy. The tunnel agent is reached at `/api/tunnel/` through that same ingress path.
- Rebuild/reinstall after pulling UI updates that change `ethio-home/www/`.
