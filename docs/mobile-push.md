# Notifications in the mobile app

Two different paths deliver the same Home Assistant notification, and knowing
which one you are testing saves a lot of confusion.

**While the app is running**, Home Assistant sends notifications over the
WebSocket connection the app already holds
(`mobile_app/push_notification_channel`). The app confirms each one, which is
what stops Core from also trying the second path. This needs no credentials, no
internet, and no add-on beyond what sign-in already requires. If notifications
work when the app is open and not when it is closed, nothing below is broken —
you simply have not set up the second path.

**Once the app is killed**, that channel is gone. Home Assistant falls back to
POSTing the payload to whatever `push_url` the device registration carries. That
URL points at the push relay in the
[Et Remote Access](https://github.com/kiyosoft/et-home-remote) add-on, which
reshapes the payload and hands it to the Expo Push Service. Expo passes it to
APNs or FCM, and the operating system draws the notification. This is the only
way to reach a phone that is not running the app.

```text
app running     HA Core ──websocket──> app ──> local notification
app killed      HA Core ──push_url──> relay ──> exp.host ──> APNs/FCM ──> OS
```

## What you need

- The **Et Remote Access** add-on, with `enable_push_relay` on (the default).
  The add-on publishes its address as `sensor.ethio_home_push_relay`; the app
  reads that entity and puts the URL on the device registration. There is no
  relay code in the app.
- A build made with **EAS**, carrying FCM credentials for Android and an APNs
  key for iOS. A build without them installs and runs fine, and closed-app
  notifications silently never arrive.
- **Internet access on the Home Assistant host.** Expo's push service is a cloud
  service, so even a notification from a hub sitting next to the phone leaves
  the network and comes back. There is no local-only version of this path.

## One-time credential setup

Run these from `apps/mobile/`. `pnpm exec` uses the pinned `eas-cli` from
`devDependencies` rather than whatever is installed globally.

```bash
pnpm exec eas login
pnpm exec eas init      # writes extra.eas.projectId into app.json
```

### Android

Expo sends through FCM V1, which needs a service account key uploaded to EAS
and a `google-services.json` in the app.

1. Create a Firebase project (or open the existing one) and go to
   **Project settings → Service accounts → Generate new private key**.
2. Upload it: `pnpm exec eas credentials`, then **Android → production →
   Google Service Account → Manage your Google Service Account Key for Push
   Notifications (FCM V1) → Set up a … key → Upload a new service account key**.
3. Download `google-services.json` from the Firebase console into
   `apps/mobile/`. `app.json` already points `android.googleServicesFile` at it,
   so the build fails loudly if it is missing.

`google-services.json` holds only public-facing identifiers and Expo considers
it safe to commit; this repo keeps it out of git anyway, because the Firebase
project belongs to whoever is building. The service account key is a real
secret and must never be committed.

### iOS

A paid Apple Developer account is required. Register the test device first, then
build — EAS offers to set up push notifications and to generate an Apple Push
Notifications service key, and answering yes to both is all that is needed.
`pnpm exec eas credentials` does the same thing outside a build.

### Build

```bash
pnpm exec eas build --profile development --platform android
pnpm exec eas build --profile development --platform ios
```

### Building locally instead

EAS manages the push entitlement for you. A local build does not, and gets this
wrong in a way that looks like a code problem:

- **`no valid "aps-environment" entitlement string found for application`** means
  the native project is stale. `expo run:ios` skips prebuild when `ios/` already
  exists, so a plugin change in `app.json` never reaches the generated project.
  Run `pnpm exec expo prebuild -p ios --clean` and build again.
- **`ld: cannot link directly with 'SwiftUICore'`** comes from React Native's
  debug dylib against recent iOS SDKs. Build with
  `pnpm exec expo run:ios --configuration Release`. EAS builds are unaffected.

## Checking it works

The Activity tab is a feed, not a status panel. Token registration happens in
the background once notification permission is granted and the push relay is
reachable. To confirm the closed-app path, fully swipe the app away, then call
`notify` on the device from **Developer tools → Actions** in Home Assistant. A
notification that arrives with the app open proves only the WebSocket path.

The relay names tokens Expo refused in the `invalid_push_tokens` attribute on
`sensor.ethio_home_push_relay`, as the last eight characters of each so a token
nobody should have does not sit on an entity every Home Assistant user can read.
Each phone looks for the token it holds, so one dead token does not make every
device throw away a working one, and registering a fresh token clears the warning
on its own. A relay older than 0.3.3 does not send the attribute at all, and a
phone talking to one falls back to treating the warning as its own.

## Priority

The app honours the same fields the official companion uses. Send them on
`notify.mobile_app_<device>`:

**Android** — heads-up / delivery urgency:

```yaml
action: notify.mobile_app_<device>
data:
  title: "Smoke alarm"
  message: "Kitchen detector is on."
  data:
    ttl: 0
    priority: high
    importance: max
    channel: Alarm
```

`importance` is `min`, `low`, `default`, `high`, or `max`. If it is omitted,
`priority: high` still maps to a heads-up. A named `channel` is created the
first time it is used (while the app is open). Unnamed high-priority
notifications use the default channel the closed-app relay already pins to.

**iOS** — interruption level:

```yaml
action: notify.mobile_app_<device>
data:
  title: "Leak"
  message: "Water under the sink."
  data:
    push:
      interruption-level: time-sensitive
```

Values are `passive`, `active` (default), `time-sensitive`, and `critical`.
Time-sensitive can break through Focus. Critical alerts also need Apple's
entitlement; without it iOS treats them as a normal alert. The older
`push.sound.critical: 1` form is accepted as critical too.

`ttl: 0` only affects the closed-app FCM path (the phone is woken immediately).
It does nothing on the WebSocket path, because the app is already running.

## Known limitations

- **`clear_notification` and `command_*` messages need the app running.** They
  tell the app to do something rather than showing anything, so the relay drops
  them and reports success. A notification dismissed by an automation stays on
  screen until the app next runs.
- **Action buttons do not appear on notifications drawn while the app was
  closed.** The buttons come from a notification category the app registers at
  presentation time, which cannot happen when the app is not running. The
  actions are still on the entry in the Activity tab.
- **The relay entity can go missing for a few minutes after a Home Assistant
  restart.** Entity states published over the REST API do not survive a restart,
  and the relay republishes on a five-minute heartbeat. The app treats a missing
  entity as "leave the token alone" rather than clearing anything, so this
  resolves itself.
- **Only what is still in the notification tray reaches the Activity tab.** A
  notification delivered while the app is not in the foreground is drawn by the
  OS with no code of ours running, so the app reads the tray on launch and again
  whenever it returns to the foreground. Anything the user swiped away before
  that is gone, apart from one they swiped by opening it, which is filed on the
  way in.
- **`data.channel` on closed-app Android still uses the default channel.**
  Android needs the channel to already exist on the device, and only the app can
  create one, which it cannot do while it is not running. Named channels and
  per-channel importance apply to notifications presented while the app is
  open. The relay still pins killed-app pushes to the default high-importance
  channel so a missing custom channel cannot silently drop the notification.
  `priority: high` / `ttl: 0` still affect FCM delivery urgency on that path.
- **The daily limit is per device token and resets at UTC midnight**, not at
  local midnight. It exists to stop a runaway automation from flooding a phone.
- **iOS critical alerts need Apple's entitlement.** Sending
  `interruption-level: critical` without it gets treated as a normal alert.
- **A restricted Firebase API key breaks token registration.** If the app never
  gets a push token on Android, check the key from `google-services.json` in the
  Google Cloud console: it needs the FCM Registration API and Firebase
  Installations API allowed, and any Android app restriction must use the Play
  Store app signing SHA-1, not the upload key.
