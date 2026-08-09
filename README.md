# Ethio Home

Plugin-driven Home Assistant dashboard platform.

## Requirements

- Node.js 20+
- pnpm 10.9.0 (`packageManager` is pinned)

## Setup

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5180](http://localhost:5180) (Vite falls back to the next free port if 5180 is busy).

## Connect to Home Assistant

1. In Home Assistant: **Profile → Security → Long-lived access tokens → Create token**
2. On the Ethio Home setup screen, enter your HA URL (e.g. `http://homeassistant.local:8123`) and paste the token
3. Click **Connect**

Connection settings, theme, dashboard JSON, and PIN/kiosk prefs are stored in `localStorage` on this device.

## Demo mode

Click **Start demo** on the setup screen to explore a sample dashboard with simulated entities (climate, cover, person, weather, Team Tracker, and more). No Home Assistant instance required.

## Builder

- **Edit** in the header to drag, resize, add, and configure widgets
- Floating **page dock** at the bottom (double-click a page in edit mode to rename)
- Widget settings use schema-driven forms with an entity picker
- **Settings** gear: header, plugins, PIN, kiosk / cards-only, import/export JSON
- Layouts are per breakpoint (`lg` / `md` / `sm`) and autosave
- **Cmd/Ctrl+K** opens the command palette (edit, pages, plugins, theme, disconnect)

## Plugins

| Package | Role |
| --- | --- |
| `@ethio/plugin-sdk` | `definePlugin` / `defineWidget` / `defineCommand`, HA hooks |
| `@ethio/core` | Entity State, Toggle, Climate, Cover, Person, Weather |
| `@ethio/teamtracker` | Team Card scoreboard for ha-teamtracker sensors |
| `@ethio/ha-sdk` | Home Assistant WebSocket client + demo provider |

### Built-in (compile-time)

Import the plugin in `apps/dashboard/src/plugins/bootstrap.ts` and pass it to `loadPlugins([...])`. See [docs/plugins.md](./docs/plugins.md).

### Open registry (dynamic)

1. **Settings → Browse registry** (or palette → “Open plugins”)
2. Install **Example Badge** — loads `registry/plugins/example-badge/index.js` at runtime
3. Refresh keeps the install; uninstall removes it from the picker

Catalog: `apps/dashboard/public/registry/catalog.json`. Remote plugins share the host React / SDK via `globalThis.__ETHIO_HOST__`.

### Team Tracker (live)

Install [ha-teamtracker](https://github.com/vasqued2/ha-teamtracker) in Home Assistant, create a team sensor, then add **Team Card** and bind that entity. Demo mode uses `sensor.demo_arsenal` out of the box.

Card UX inspired by [ha-teamtracker-card](https://github.com/vasqued2/ha-teamtracker-card).

## Home Assistant add-on

Serves the production dashboard over HA **ingress** (sidebar panel). You still connect with a HA URL + long-lived access token.

1. **Settings → Add-ons → Add-on store → ⋮ → Repositories**
2. Add:

   ```text
   https://github.com/kiyosoft/home-project
   ```

3. Install **Ethio Home**, start it, open from the sidebar
4. Enter your HA URL and long-lived access token on the setup screen

Maintainers: run `pnpm prepare:addon` after UI changes, then commit `ethio-home/www/` and bump `ethio-home/config.yaml` `version`.

Details: [ethio-home/DOCS.md](./ethio-home/DOCS.md).

## Remote access (Cloudflare Tunnel)

Expose the local Vite dashboard and Home Assistant off your LAN via [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/). Live mode needs **both** origins: the SPA and HA (browser WebSocket + long-lived token).

### Prerequisites

1. Install [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) and ensure it is on your `PATH`
2. Dashboard running locally (`pnpm dev` → `http://127.0.0.1:5180`)
3. Home Assistant reachable from this machine at `http://127.0.0.1:8123`, or set `ETHIO_HA_ORIGIN` (e.g. `http://192.168.x.x:8123`)

`pnpm tunnel` probes both origins before starting; a Cloudflare **502** usually means the origin was down or bound only on IPv6 — restart `pnpm dev` after pulling so Vite listens on `127.0.0.1`.

### Home Assistant reverse-proxy config (required)

Cloudflared sends `X-Forwarded-*` headers. Without trusting the proxy, HA responds with **`400: Bad Request`**.

On the Home Assistant host, add to `configuration.yaml` (or the HTTP integration), then restart HA:

```yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    # IP/subnet of the machine running `pnpm tunnel` / cloudflared
    - 192.168.100.0/24
```

Use your LAN subnet (or the single IP of this machine). If cloudflared runs on the HA host itself, include `127.0.0.1` and `::1`.

### Quick Tunnel (default)

In one terminal:

```bash
pnpm dev
```

In another:

```bash
pnpm tunnel
```

The script starts **two** Quick Tunnels and prints:

- **Dashboard** — open this URL remotely
- **Home Assistant** — paste this URL (plus your long-lived access token) on the Ethio Home setup screen

URLs are also written to `scripts/tunnel/.urls.json` (gitignored). Quick Tunnel hostnames change every run. Anyone with the URLs can load the SPA; treat the HA URL and token as secrets.

Optional env overrides:

| Variable | Default |
| --- | --- |
| `ETHIO_DASHBOARD_ORIGIN` | `http://127.0.0.1:5180` |
| `ETHIO_HA_ORIGIN` | `http://127.0.0.1:8123` |
| `ETHIO_HA_HOST_HEADER` | hostname from `ETHIO_HA_ORIGIN` |
| `CLOUDFLARED_BIN` | `cloudflared` |

### Named Tunnel (stable hostnames)

1. Create a tunnel and credentials with `cloudflared` (`tunnel login` / `tunnel create` / `tunnel route dns`)
2. Copy [`scripts/tunnel/config.example.yml`](./scripts/tunnel/config.example.yml) → `scripts/tunnel/config.yml` and fill in tunnel UUID, credentials path, and hostnames
3. Run:

```bash
pnpm tunnel:named
```

Or set `ETHIO_TUNNEL_CONFIG` to another config path. For broader sharing later, put [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) in front of both hostnames.

When Ethio Home runs as a Home Assistant add-on, prefer a host-level or official Cloudflare Tunnel add-on for HA; keep Ethio Home on Supervisor ingress rather than baking Quick Tunnel into the add-on image.

## Workspace

```text
apps/dashboard           Vite + React 19 UI + plugin host
packages/plugin-sdk      Plugin contracts + HA hooks
packages/core            Official core widgets
packages/teamtracker     Team Tracker plugin
packages/ha-sdk          HA client + demo entities
ethio-home               Home Assistant add-on (nginx + ingress)
docs/plugins.md          Plugin authoring guide
```

## Scripts

| Command              | Description                                   |
| -------------------- | --------------------------------------------- |
| `pnpm dev`           | Start the dashboard dev server                |
| `pnpm build`         | Build packages and the dashboard              |
| `pnpm prepare:addon` | Build and sync UI into `ethio-home/www`       |
| `pnpm preview`       | Preview the production dashboard build        |
| `pnpm tunnel`        | Quick Tunnels for dashboard + HA              |
| `pnpm tunnel:named`  | Named tunnel via `scripts/tunnel/config.yml`  |

## Themes

**Default:** Light, Dark  
**Atmosphere:** AMOLED, Glass, Minimal  
**SCIFICN:** Sci-Fi / Star Wars / Alien ([scificn-ui](https://github.com/baxy5/scificn-ui))

Widgets should use semantic tokens (`bg-card`, `text-foreground`, …).

See [PLATFORM.md](./PLATFORM.md) for the full roadmap.
