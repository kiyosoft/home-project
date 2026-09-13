# Ethio Home

Plugin-driven dashboard for Home Assistant. This add-on serves the Ethio Home web UI through **ingress** (sidebar panel). Entity traffic stays in your browser: the add-on hands the dashboard a Home Assistant access token, and the dashboard talks to Home Assistant directly.

## Installation (GitHub)

1. In Home Assistant: **Settings → Add-ons → Add-on store → ⋮ → Repositories**.
2. Add:

   ```text
   https://github.com/kiyosoft/home-project
   ```

3. Find **Ethio Home** in the store, install, and start it.
4. Open it from the sidebar (or **Open Web UI**).

The repository root contains `repository.yaml` and the `ethio-home/` add-on folder. Supervisor pulls `ghcr.io/kiyosoft/ethio-home` (the `image` in `config.yaml`) instead of building on the Home Assistant machine.

## First connection

Open Ethio Home from the sidebar. Because Home Assistant is already serving the page, the dashboard continues that session and skips the login screen.

Disconnect still returns to setup so you can start **demo** mode or paste a long-lived access token. Refreshing the sidebar panel signs you back in.

### Long-lived access token instead

Choose **Use a long-lived access token instead** on the setup screen if you would rather not sign in:

1. In Home Assistant: **Profile → Security → Long-lived access tokens → Create token**.
2. Enter your HA URL, paste the token, and click **Connect**.

Settings and dashboard layout are stored in the browser (`localStorage`) for that device.

## Demo mode

Use **Start demo** on the setup screen to explore sample widgets without connecting to Home Assistant.

## Publishing the add-on (maintainers)

The dashboard UI is not committed. GitHub Actions builds it and publishes the add-on image on push to `main` (workflow: `.github/workflows/publish-addon.yaml`).

1. Bump `version` in `ethio-home/config.yaml` when Home Assistant should treat this as a new add-on release.
2. Push to `main`.
3. Wait for **Publish add-on** to finish.
4. If this is the first publish, set these GHCR packages to **public** so Supervisor can pull them: `ethio-home`, `amd64-ethio-home`, `aarch64-ethio-home`.
5. Update the add-on in Home Assistant.

Switching the workflow from `push` to `release` can happen later without changing this layout.

## Mobile app sign-in

The mobile app signs in with your Home Assistant username and password on its own login page. Two-factor accounts get a second step asking for the code. You can still paste a long-lived access token instead.

## Mobile app notifications

Notifications reach the app over the connection it already holds, so they work as soon as the phone is registered with Home Assistant and you have allowed notifications. Nothing here needs configuring.

Reaching the phone once the app has been closed is a separate path: Home Assistant hands the notification to a push relay, which sends it through Apple's and Google's push services. That relay is part of the **Et Remote Access** add-on, and the app discovers it on its own — the Activity tab says whether it found one. Setup and its limitations are in [docs/mobile-push.md](https://github.com/kiyosoft/home-project/blob/main/docs/mobile-push.md).

## Notes

- Ingress only allows traffic from the Supervisor ingress proxy.
- Kiosk mode also hides the Home Assistant sidebar while the add-on is open in the sidebar panel. Exit kiosk (Esc or long-press) to get it back.
- The sidebar panel is limited to Home Assistant admins. The add-on mints a Home Assistant access token through Supervisor and never exposes `SUPERVISOR_TOKEN` to the browser.
- Home Assistant only accepts its login API from pages it serves itself, which is why signing in works here but not from a dashboard hosted elsewhere. Use a long-lived access token in that case.
- Supervisor installs the matching image tag from `config.yaml` `version`. Bump that version when you want updates to roll out.
