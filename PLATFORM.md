# Ethio Home

A modern, plugin-driven dashboard platform for Home Assistant.

Home Assistant stays the automation engine. Ethio Home owns the
everyday control surface: layouts, navigation, themes, and extensibility.

------------------------------------------------------------------------

# Competitive Context

Ethio Home is designed against two current reference products:
[Tunet](https://github.com/oyvhov/Tunet) and
[GlassHome](https://glasshome.app/).

## Tunet — what it is

Tunet is an open-source React dashboard (Vite + Tailwind) that replaces
YAML with a drag-and-drop masonry grid. It ships a large built-in card
set (lights, climate, media, vacuum, energy/Nordpool, calendar, EV, and
more), live WebSocket updates, glassmorphism themes, PIN-locked editing,
multi-language UI, and server-side profiles that sync and deploy across
devices (Express + SQLite). Install via HA add-on or Docker.

**Strengths**

- Open source and easy to self-host
- Broad built-in card coverage for daily HA domains
- Profile sync + deploy-to-device
- PIN lockdown for family / kiosk use
- Cards-only mode for wall tablets

**Gaps**

- Cards are monolithic and in-tree — no first-class plugin SDK or registry
- Extensibility is “fork the app,” not publish a package
- Editing UX and mobile layout remain ongoing work
- Theming is mostly visual variants, not a deep token/plugin system
- No community widget marketplace or capability model

## GlassHome — what it is

GlassHome is a local-first dashboard product. **Dash** runs on your
hardware, talks to HA over WebSocket, and stores layouts in local SQLite.
Optional **Hub** hosts a widget registry, accounts, orgs, and tunnel
provisioning — never in the entity data path. Widgets are SolidJS + Zod
config schemas; settings forms are auto-generated. Install via HA add-on
or Docker. Free tier covers official widgets and themes; Pro unlocks
community widgets and custom theme editing.

**Strengths**

- Polished, touch-first edit/live gesture model
- Per-breakpoint layouts (`lg` / `md` / `sm`) that do not overwrite each
  other
- Real Widget SDK + CLI (scaffold, hot-reload connect, publish)
- Auto-generated settings from Zod schemas
- Capability / permission prompts for third-party widgets
- Demo mode before connecting HA
- Room/area-oriented navigation and dock for multiple dashboards

**Gaps**

- Dashboard app is closed-source
- Community widgets and custom themes gated behind Pro
- Widgets are SolidJS-only (smaller ecosystem than React)
- Hub is required for community install / publish
- Plugins are widget-centric — not a broader platform extension model
  (services, commands, icons as first-class contributions)

## Ethio Home — how we win

| Area | Tunet | GlassHome | Ethio Home |
| --- | --- | --- | --- |
| License | Open (GPL) | Dash closed; SDK open | Fully open platform |
| Stack | React 18 | SolidJS widgets | React 19 |
| Extensibility | Built-in cards only | Widget SDK + Hub | Plugin system (widgets, services, commands, icons, settings) |
| Settings UI | Hand-built per card | Zod → auto forms | Schema-driven auto forms |
| Layout | Masonry DnD | Per-breakpoint grid | Per-breakpoint React Grid Layout |
| Sync | Server profiles + deploy | Local SQLite only | Local-first + optional profile sync / deploy |
| Family / kiosk | PIN lock, cards-only | Guest scopes, kiosk pairing | PIN lock, kiosk mode, guest scopes |
| Marketplace | None | Hub (Pro-gated) | Open registry, no paywall for installs |
| Navigation | Custom pages | Dock + rooms | Dashboard-owned pages + floating menu + command palette |
| AI | None | None | Copilot (generate, recommend, explain, call services) |

**Differentiators to protect**

1. **Plugins over cards** — capabilities ship as packages, not fork PRs.
2. **Open by default** — no Pro gate for community widgets.
3. **Schema-driven config** — widgets declare config; platform renders forms.
4. **Command bus + palette** — keyboard-first control, not just tiles.
5. **AI copilot** — dashboard authoring and HA service assistance.
6. **Tunet-class sync** without giving up GlassHome-class SDK quality.

------------------------------------------------------------------------

# Core Philosophy

- Home Assistant is the source of truth.
- Dashboards own navigation and layouts.
- Plugins provide capabilities, not application structure.
- Configure in the UI — no YAML, no restart-to-apply.
- Local-first: entity state and layouts never require a cloud relay.
- Focus on a beautiful, touch-first dashboard-building experience.

------------------------------------------------------------------------

# Technology Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- React Grid Layout
- Zustand
- TanStack Query
- React Router
- Framer Motion
- Zod (widget / plugin config schemas)
- Local persistence (SQLite or equivalent) for dashboards and profiles

------------------------------------------------------------------------

# Product Pieces

``` text
Home Assistant
      │
      ├── WebSocket API
      ├── REST API
      │
      ▼
Ethio Home Runtime (local)
      │
      ├── HA SDK + Auth (OAuth / token)
      ├── Entity Store
      ├── Dashboard Engine
      ├── Widget Registry
      ├── Plugin Manager
      ├── Theme Engine
      ├── Command Bus
      └── Persistence (layouts, profiles, settings)

Optional later:
  Registry / Hub  →  discover & install plugins (never in HA data path)
```

## Runtime

The app users open (browser, wall tablet, phone). Runs on local hardware.
Talks directly to Home Assistant. Stores dashboards, themes, and
connection settings locally.

## Registry (later)

Optional catalog for discovering and installing community plugins.
Never sits in the HA data path. Local use does not require an account.

## Packaging

- Home Assistant add-on (MVP in `ethio-home/`: static SPA via ingress; install from GitHub monorepo; LLAT setup unchanged; supervisor auto-auth later)
- Docker Compose / standalone container
- Local Vite dev for contributors

------------------------------------------------------------------------

# Responsibilities

## Platform

- HA connection, auth, and reconnection
- Entity store and live updates
- Loading plugins and registering contributions
- Widget registry and sandboxing / capability checks
- Rendering dashboards (live + edit modes)
- Persistence (layouts, profiles, settings)
- Theme system
- Command palette and command bus
- Demo mode (simulated entities for first-run without HA)

## Dashboard

A dashboard owns:

- Pages
- Navigation
- Layouts (per breakpoint)
- Widget placement and configuration
- Responsive layouts
- Dashboard settings

Example:

``` text
Home
├── Overview
├── Living Room
├── Kitchen
├── Security
└── Sports
```

Pages are created by the dashboard designer — not plugins.

## Plugin

Plugins extend the platform. A plugin may contribute:

- Widgets
- Services
- Commands
- Icons
- Assets
- Plugin settings

A plugin does **not** create pages, routes, or navigation.

------------------------------------------------------------------------

# Connection & Auth

- Setup wizard: HA URL → username/password (preferred) or long-lived token
- Demo mode with simulated entities when HA is unavailable
- Validated session against the authenticated HA user for protected
  profile/settings APIs
- Automatic reconnect with clear connection status
- Optional PIN lock to prevent accidental edits (family / kiosk)

------------------------------------------------------------------------

# Layout System

Inspired by GlassHome’s breakpoint model and Tunet’s drag-and-drop grid.

- Grid powered by React Grid Layout
- Independent layouts per breakpoint, e.g. `lg` / `md` / `sm`
- Editing a phone layout must not overwrite desktop
- Edit mode vs live mode with distinct gestures:
  - Live: tap = primary action; long-press = detail sheet
  - Edit: long-press = drag; corner grip = resize; gear = config
- Autosave — no Save / Discard for layout changes
- Kiosk / cards-only mode for wall tablets

------------------------------------------------------------------------

# Plugin Structure

``` text
plugins/
└── teamtracker/
    ├── manifest.ts
    ├── widgets/
    │   ├── TeamCard.tsx
    │   ├── Fixtures.tsx
    │   └── Standings.tsx
    ├── services/
    │   └── TeamTrackerService.ts
    ├── settings/
    │   └── PluginSettings.tsx
    ├── icons/
    └── assets/
```

------------------------------------------------------------------------

# Plugin Manifest

``` ts
definePlugin({
  id: "@kidus/teamtracker",
  name: "Team Tracker",

  widgets: [
    TeamCard,
    Fixtures,
    Standings,
  ],

  services: [
    TeamTrackerService,
  ],

  commands: [
    RefreshFixtures,
  ],

  settingsComponent: PluginSettings,
})
```

------------------------------------------------------------------------

# Widget Registration

Each widget is registered with the platform.

``` ts
defineWidget({
  id: "team-card",
  name: "Team Card",
  component: TeamCard,
  // Zod (or equivalent) schema → platform auto-generates settings UI
  configSchema: TeamCardConfigSchema,
  settingsComponent: TeamCardSettings, // optional override
  minSize: { w: 2, h: 2 },
  maxSize: { w: 6, h: 4 },
  capabilities: ["entity.read", "service.call"],
})
```

The dashboard builder exposes the widget in its library.

**Rules borrowed from GlassHome’s SDK quality bar**

- Widgets do not open their own HA connection or hold tokens
- Entity reads / service calls go through platform hooks
- Declared capabilities drive permission prompts for third-party plugins
- Config versioning supports migrations when schema breaks

------------------------------------------------------------------------

# Dashboard JSON

``` json
{
  "id": "home",
  "title": "Home",
  "pages": [
    {
      "id": "sports",
      "title": "Sports",
      "layouts": {
        "lg": [{ "i": "w1", "x": 0, "y": 0, "w": 4, "h": 3 }],
        "md": [{ "i": "w1", "x": 0, "y": 0, "w": 4, "h": 3 }],
        "sm": [{ "i": "w1", "x": 0, "y": 0, "w": 4, "h": 3 }]
      },
      "widgets": [
        {
          "id": "w1",
          "type": "@kidus/teamtracker/team-card",
          "config": {
            "team": "Arsenal"
          }
        }
      ]
    }
  ]
}
```

------------------------------------------------------------------------

# Dashboard Builder

The builder is responsible for:

- Creating pages and organizing navigation
- Adding / removing widgets
- Resizing and moving widgets
- Configuring widgets (schema-driven forms)
- Per-breakpoint layout editing
- Import / export of dashboard JSON
- Saving layouts (autosave + optional named profiles)

React Grid Layout powers dragging and resizing.

------------------------------------------------------------------------

# Navigation

Runtime navigation is dashboard-driven.

- Full-screen dashboard
- Floating menu / dock for pages and dashboards
- Command palette
- Global search (entities, pages, commands)

No permanent sidebar in v1.

------------------------------------------------------------------------

# Profiles & Multi-Device

Take Tunet’s sync model without making cloud mandatory.

- Local persistence by default
- Named profiles (layouts + settings) per HA user
- Import / export JSON
- Optional server-side profile sync and deploy-to-device
- Guest / scoped views for family members and wall tablets

------------------------------------------------------------------------

# Theme System

Token-based. Themes apply through CSS variables widgets must respect.

Built-in themes:

- Light
- Dark
- AMOLED
- Glass
- Minimal
- Apple Home

Later: custom theme editor and community theme packages.

------------------------------------------------------------------------

# Core Widget Set (v1 target)

Ship a Tunet-competitive official set under `@ethio/core` (or similar):

- Light / switch / button
- Sensor / binary sensor / batteries
- Climate
- Cover / blinds
- Scene
- Lock
- Camera
- Media
- Weather
- Area summary
- Person / presence

Energy, vacuum, calendar, and EV-class widgets can follow as core or
first-party plugins.

------------------------------------------------------------------------

# AI Copilot

- Generate dashboards from rooms / areas
- Recommend widgets for selected entities
- Explain automations
- Execute Home Assistant services with confirmation

------------------------------------------------------------------------

# Design Principles

1. Home Assistant is the source of truth.
2. Dashboards own pages and navigation.
3. Plugins provide reusable capabilities.
4. React Grid Layout owns widget layout (per breakpoint).
5. Widgets are isolated, schema-configured, and reusable.
6. Everything is extensible through plugins.
7. Local-first privacy — no cloud relay for entity data.
8. Touch-first gestures; keyboard power users get a command palette.
9. Autosave and demo mode — short path from install to useful dashboard.
10. Open registry — community plugins install without a paywall.

------------------------------------------------------------------------

# Phased Delivery (draft)

## Phase 1 — Foundation & live shell

- Monorepo / app scaffold (React 19, Vite, TS, Tailwind, shadcn)
- HA SDK (connect, auth, WebSocket entity store)
- Demo mode
- Minimal runtime: one page, hardcoded sample dashboard
- Core widgets: entity state + light/switch toggle
- Local connection settings persistence
- Basic light / dark tokens

## Phase 2 — Builder

- Edit vs live mode + gestures
- React Grid Layout with per-breakpoint layouts
- Widget picker and schema-driven settings
- Multi-page dashboards + floating navigation
- Dashboard JSON import / export
- PIN lock / kiosk mode

## Phase 3 — Plugin platform

- `definePlugin` / `defineWidget` contracts
- Plugin loader + capability checks
- Official `@ethio/core` widget pack
- Local plugin install / hot-reload for developers
- Command bus + command palette

## Phase 4 — Polish & sync

- Full theme pack + custom tokens
- Profile sync / deploy-to-device
- HA add-on + Docker packaging (add-on MVP: ingress SPA; prebuilt images / supervisor auth next)
- Area-aware onboarding
- AI copilot (initial)
- Open registry (optional Hub)
