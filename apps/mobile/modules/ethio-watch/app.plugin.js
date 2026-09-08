/**
 * The watchOS target itself is injected by `@bacons/apple-targets` from
 * `targets/watch`. This plugin only exists so the local module is a valid
 * Expo plugin entry if listed in app.json.
 */
module.exports = (config) => config;
