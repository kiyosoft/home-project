import * as PluginSdk from "@ethio/plugin-sdk";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as JsxRuntime from "react/jsx-runtime";
import * as Zod from "zod";

export interface EthioHostGlobals {
  React: typeof React;
  ReactDOM: typeof ReactDOM;
  jsxRuntime: typeof JsxRuntime;
  pluginSdk: typeof PluginSdk;
  zod: typeof Zod;
}

declare global {
  interface Window {
    __ETHIO_HOST__?: EthioHostGlobals;
  }
}

/** Expose shared deps for remote ESM plugins (no second React copy). */
export function exposeHostGlobals(): void {
  window.__ETHIO_HOST__ = {
    React,
    ReactDOM,
    jsxRuntime: JsxRuntime,
    pluginSdk: PluginSdk,
    zod: Zod,
  };
}
