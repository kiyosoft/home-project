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
  Its own docs cover the options; the app finds it by itself.
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

The Activity tab has a **Notifications when the app is closed** card that says
which of these is true, so you do not have to guess:

| Card says | Meaning |
| --- | --- |
| On | Home Assistant has a live push token and the relay's URL |
| Setting up | Fetching the token, or handing it to Home Assistant |
| Off — only while open | No relay found, so there is no `push_url` to register |
| Off — simulator | Simulators and emulators cannot get a push token |
| Off — no EAS project id | The build was not made with EAS |
| Off — token rejected | The relay reached Expo and Expo refused the token |
| Off — timed out | Registering with APNs or FCM never came back, usually no route out |
| Off — Home Assistant refused it | We have a token and the registration update failed |
| Off — not registered | Home Assistant has forgotten the device and re-registering failed |

Anything below the card in smaller text is the underlying error, printed
verbatim because a release build has no console to read it from.

**Off — token rejected** is reported per device. The relay names the tokens Expo
refused in the `invalid_push_tokens` attribute on
`sensor.ethio_home_push_relay`, as the last eight characters of each so a token
nobody should have does not sit on an entity every Home Assistant user can read.
Each phone looks for the token it holds, so one dead token does not make every
device throw away a working one, and registering a fresh token clears the warning
on its own. A relay older than 0.3.3 does not send the attribute at all, and a
phone talking to one falls back to treating the warning as its own.

Then test the real thing: fully swipe the app away, and call `notify` on the
device from **Developer tools → Actions** in Home Assistant. A notification that
arrives with the app open proves only the WebSocket path.

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
- **`data.channel` is ignored on notifications drawn while the app was closed.**
  Android needs the channel to already exist on the device, and only the app can
  create one, which it cannot do while it is not running. Expo returns a
  successful ticket for a channel that does not exist and then Android draws
  nothing, so honouring the requested name would silently lose the
  notification — the relay pins every push to the one channel the app creates
  instead. Per-channel importance and sound therefore do not apply to these.
- **The daily limit is per device token and resets at UTC midnight**, not at
  local midnight. It exists to stop a runaway automation from flooding a phone.
- **iOS critical alerts need Apple's entitlement.** Sending
  `interruption-level: critical` without it gets treated as a normal alert.
- **A restricted Firebase API key breaks token registration.** If the app never
  gets a push token on Android, check the key from `google-services.json` in the
  Google Cloud console: it needs the FCM Registration API and Firebase
  Installations API allowed, and any Android app restriction must use the Play
  Store app signing SHA-1, not the upload key.
