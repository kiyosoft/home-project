# Ethio Home (Home Assistant add-on)

Serves the Ethio Home dashboard over Home Assistant ingress.

## Install from GitHub

In Home Assistant: **Settings → Add-ons → Add-on store → ⋮ → Repositories**, add:

```text
https://github.com/kiyosoft/home-project
```

Install **Ethio Home**, start it, open from the sidebar. The dashboard uses your current Home Assistant session.

Home Assistant pulls a pre-built image from GHCR (`ghcr.io/kiyosoft/ethio-home`). That image is published by GitHub Actions on push to `main`.

See [DOCS.md](./DOCS.md) for details.
