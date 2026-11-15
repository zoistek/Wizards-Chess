# Wizards chess

Expo SDK 58 app retaining the original 3D cathedral, fire, chess characters, camera controls, bot and capture animations. The existing browser renderer runs inside a bundled, hardware-accelerated native WebView; it does not load the WordPress website. All seven models, embedded textures and 24 animation clips are packaged in the app. Solo bot play works offline after installation.

The approved app is promoted to `main`; `test/expo-app` remains available for review. The user approved an internal Android APK build. No store submission or automatic push-triggered build is configured. The manual Android preview workflow uses the existing GitHub `EXPO` secret.

## Review without an EAS build

```sh
npm ci
npm start
```

Open the QR code in Expo Go on Android. The first development launch downloads the bundled game asset from Metro; installed builds package that asset locally. Test Android hardware rendering during native build testing. `npm run preview:web` also runs the same game in a browser at port 4173, useful for checking bot play and multiplayer without Expo.

## Game modes

- The game opens in the original bot mode.
- **Challenge a friend** lets the creator choose White, Black or Random.
- The first guest who submits Join gets the other colour. Database row locks prevent two concurrent guests taking the same seat.
- Later visitors watch as spectators. The server rejects their moves.
- Copy or Share sends only the 12-character challenge code, without a URL or hosting address. Friends open the game and paste it into the challenge box to join automatically, or type the code and select Join / watch. Nicknames are optional. The first guest plays; subsequent guests watch. Older deep links remain supported for compatibility.
- A guest reclaims their seat using their device's stored random token. Native identities are stored in SecureStore, not in shared browser tabs.
- The app uses the existing mobile adaptive-quality profile and lighter mobile lighting. Desktop browser settings are unchanged.

## Supabase test backend

Project: `Wizards Chess` (`wscmdygycnzgsjspoebk`). Function: `wizards-chess-test`. Tables are isolated in `chess_test`, without direct anonymous/authenticated client grants. RLS denies direct client access. The public RPC is executable only by `service_role`; only the Edge Function can call it. The server credential never enters the client. `config.json` contains the public project URL and publishable key only.

The Edge Function authenticates custom 256-bit guest seat tokens and hashes them before storage. `verify_jwt` is intentionally false because this is nickname-based guest play rather than Supabase Auth login. Browser CORS allows the public game clients; all mutation authorization and chess move validation occur server-side. Seat hashes never appear in public responses. Read-only spectators can access a room when given its code.

Rooms expire after seven inactive days; expired rows are not yet physically pruned. Creation is limited to 20 rooms per token per ten minutes. Distributed abuse/rate-limit hardening is a pre-public-launch task, not a production claim for this test branch.

Backend migrations and Edge Function sources are included in `supabase/`. The two migration filenames mirror the versions applied to the dedicated test schema. Nothing in DropASize or WordPress is modified.

## Validation

```sh
npm run typecheck
npm test
npm run prepare:game
npx expo install --check
```

`npm run test:live` exercises the deployed test function and reports the disposable room code it creates. It tests simultaneous joins, reconnect, legal/illegal moves, spectator restrictions and stale state. Remove only that returned test room after testing. The initial live verification room was removed.

The local Android JavaScript export compiled successfully. This is a local bundling check, not an APK/AAB or an EAS build. Actual Android WebView GPU rendering, sharing to a second phone and installed deep-link handling still need device testing. No emulator or GPU validation is claimed.

The original animation engine omits en passant, promotion choice, repetition and fifty-move draw adjudication. The server forces queen promotion and rejects en passant so moves remain compatible with the original visuals.

## Existing Expo project and build approval

The existing Expo project was verified using the repository secret `EXPO`: `@zoistek/wizards-chess`, UUID `1d666e75-5074-4a05-be7e-4eba46ca7b7b`. The app config links to this existing project. The manual Android preview workflow verifies the same UUID before starting an approved build; it never creates a replacement project.

`eas.json` includes a manually selected internal Android APK profile (`preview`) and a store AAB profile (`production`). Neither starts anything by itself. Test package IDs use `.test` to avoid replacing a future production app. The generated black-and-gold wizard knight icon is configured as the native launcher icon. Final production package ID and store readiness remain separate from internal APK testing.

## Hosted browser test

The `docs/` folder contains the same bundled game as the native app, connected to
the isolated Supabase test backend. Live browser preview: https://zoistek.github.io/Wizards-Chess/
GitHub Pages currently serves `docs/` from `test/expo-app`; the same approved source is also on `main`. No ChatGPT sign-in is required.
Use separate devices or browser profiles to test opponent and spectator roles. Updating this preview does not start an Expo build.
Browser previews test the game and multiplayer. Native sharing, app deep links,
and Android WebView performance still require a phone app test later.

## Sound

Controls > Sound settings has independent switches for fire/wind ambience,
a simple piece-placement tap, and sword hits/statue breaking.
Movement uses an original short, quiet piece-placement tap, played once at the
end of each move. There is no sliding/grinding loop. Other effects are procedural
Web Audio. There are no film or chess.com samples, runtime audio downloads or
additional services. Browser autoplay rules require
one tap/key press before audio starts. Ambience stays quiet and pauses in
background tabs. Sound preferences persist in browser storage and, in the native
app, SecureStore. Sound captions are not included.
Capture effects follow actual animation contact and shatter cues.
Automated graph, mute, preference and lifecycle checks pass; the final audible
mix still needs listening on real phone speakers/headphones.

## Two-phone APK acceptance check

Install the same preview APK on two physical Android phones. Phone A creates a challenge as White and copies the code. Phone B pastes that code and must receive Black. Make alternating legal moves and a capture; verify both boards and animations agree, then background/reopen each app and confirm its seat is retained. Repeat with A selecting Black. A third installation joining the code must watch without gaining move controls. Listen to the piece tap and capture effects, and check startup, fire and character animations on both devices. Backend and bundling checks do not substitute for this installed-app check.

## Icon source

`assets/wizards-chess-icon.png` was generated for this app using the built-in image generator. Prompt: a square black-and-gold dark fantasy chess app icon, a sculpted golden wizard knight, restrained amber magic, a firelit cathedral backdrop, strong small-size silhouette, full-bleed background without lettering or rounded corners. The native app label is exactly `Wizards chess`. The original 3D startup and animation engine are unchanged by this branding update.
