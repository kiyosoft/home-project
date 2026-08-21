# Ethio Home plugins

## Compile-time vs dynamic

| Kind              | How it loads                                               | When to use                                          |
| ----------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Built-in          | Static import in `apps/dashboard/src/plugins/bootstrap.ts` | Official packs (`@ethio/core`, `@ethio/teamtracker`) |
| Remote (registry) | Runtime `import(entryUrl)` after install                   | Community / optional plugins                         |

Built-ins ship with the app bundle. Remote plugins are listed in `/registry/catalog.json`, installed from the Plugins UI (or Cmd/Ctrl+K → “Open plugins”), and persisted in `localStorage` (`ethio-home.installed-plugins`).

## Host globals

Remote ESM modules must **not** bundle their own React. Before import, the dashboard exposes:

```js
globalThis.__ETHIO_HOST__ = {
  React,
  ReactDOM,
  jsxRuntime, // react/jsx-runtime
  pluginSdk, // @ethio/plugin-sdk
  zod, // namespace; use host.zod.z
};
```

See `apps/dashboard/public/registry/plugins/example-badge/index.js` for a complete example.

## Catalog entry

```json
{
  "id": "@scope/name",
  "name": "Display Name",
  "version": "0.1.0",
  "description": "…",
  "entryUrl": "/registry/plugins/name/index.js",
  "capabilities": ["entity.read"]
}
```

Add the file under `apps/dashboard/public/registry/` and append the entry to `catalog.json`.

## Building a remote plugin

1. Implement with `definePlugin` / `defineWidget` from `@ethio/plugin-sdk`.
2. Bundle as ESM with **externals** (or hand-write against `__ETHIO_HOST__`):

- `react`, `react-dom`, `react/jsx-runtime`
- `@ethio/plugin-sdk`
- `zod`

3. Export `plugin` (named) and/or `default`.
4. Host the file where `entryUrl` can fetch it (same origin or CORS-enabled).
5. Register in the catalog.

## Capabilities

Widgets declare `entity.read` and/or `service.call`. The host checks these when SDK hooks run. Prefer the minimum set.

## Theme tokens

Widgets should use semantic classes (`bg-card`, `text-foreground`, `border-border`, `text-muted-foreground`, `bg-primary`, …) so Atmosphere / SCIFICN themes apply without hard-coded colors.
