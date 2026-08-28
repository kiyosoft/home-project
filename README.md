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

Opened from the HA sidebar, the [add-on](./ethio-home/DOCS.md) lets you sign in with your Home Assistant username and password.

On the dev server — or anywhere else Home Assistant is not serving the page itself — HA refuses the login API cross-origin, so use a token:

1. In Home Assistant: **Profile → Security → Long-lived access tokens → Create token**
2. On the setup screen, pick **Use a long-lived access token instead**
3. Enter your HA URL (e.g. `http://homeassistant.local:8123`), paste the token, click **Connect**

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

Serves the production dashboard over HA **ingress** (sidebar panel). Because Home Assistant serves the page, you can sign in with your HA username and password.

1. **Settings → Add-ons → Add-on store → ⋮ → Repositories**
2. Add:

   ```text
   https://github.com/kiyosoft/home-project
   ```

3. Install **Ethio Home**, start it, open from the sidebar
4. Sign in with your Home Assistant username and password

Maintainers: run `pnpm prepare:addon` after UI changes, then commit `ethio-home/www/` and bump `ethio-home/config.yaml` `version`.

Details: [ethio-home/DOCS.md](./ethio-home/DOCS.md).

## Workspace

```text
apps/dashboard           Vite + React 19 UI + plugin host
packages/plugin-sdk      Plugin contracts + HA hooks
packages/core            Official core widgets
packages/teamtracker     Team Tracker plugin
packages/ha-sdk          HA client + demo entities
apps/mobile              Expo app (React Native)
ethio-home               Home Assistant add-on (nginx + ingress)
docs/plugins.md          Plugin authoring guide
docs/mobile-push.md      Mobile notifications + push credential setup
```

## Scripts

| Command              | Description                                   |
| -------------------- | --------------------------------------------- |
| `pnpm dev`           | Start the dashboard dev server                |
| `pnpm build`         | Build packages and the dashboard              |
| `pnpm prepare:addon` | Build and sync UI into `ethio-home/www`       |
| `pnpm preview`       | Preview the production dashboard build        |

## Themes

**Default:** Light, Dark  
**Atmosphere:** AMOLED, Glass, Minimal  
**SCIFICN:** Sci-Fi / Star Wars / Alien ([scificn-ui](https://github.com/baxy5/scificn-ui))

Widgets should use semantic tokens (`bg-card`, `text-foreground`, …).

See [PLATFORM.md](./PLATFORM.md) for the full roadmap.
