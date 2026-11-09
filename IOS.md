# iOS development

For a Windows-only build and TestFlight upload, follow [CODEMAGIC.md](CODEMAGIC.md). The repository includes a manual Codemagic workflow and a shared Xcode scheme for cloud builds.

The iOS app packages the existing game with Capacitor 8. All game code, daily puzzle generation, hints, and the techniques guide are bundled; gameplay does not need an internet connection. The existing GitHub Pages build is still separate.

## Build and test

Use Node.js 22 or newer. Install the pinned dependencies with `npm ci`.

```sh
npm test
npm run build
npm run test:browser
npm run ios:sync
```

The browser tests currently use installed Microsoft Edge in headless mode. To use Playwright's bundled Chromium instead, remove `channel: 'msedge'` from `playwright.config.cjs` and install Chromium with `npx playwright install chromium`. These tests do not substitute for testing WKWebView on an iPhone.

`npm run preview:mobile` serves the mobile bundle at http://127.0.0.1:4173. `npm run build:web` generates the GitHub Pages output.

## Open on a Mac

1. Install Xcode supported by the installed Capacitor release and Apple's current submission requirements.
2. Run `npm ci`, then `npm run ios:sync` after cloning or changing web assets.
3. Run `npm run ios:open` to open `ios/App/App.xcodeproj`.
4. Select your Apple development team in Signing & Capabilities.
5. Confirm the provisional bundle identifier `com.nahiphog.doublesudoku` before registering the app. If changing it, update both `capacitor.config.json` and the Xcode target's bundle identifier.
6. Choose an iPhone simulator or a connected iPhone and run the App scheme.

The generated project uses Swift Package Manager. Xcode needs network access to resolve native build dependencies; the installed game itself does not. The template includes iPad support as well as iPhone support.

## Routing and saves

- Mobile navigation uses `index.html?route=daily`, `?route=play`, and `?route=archive/YYYY/MM/DD`. The guide is a bundled `techniques.html`. No hosting rewrites or remote server URL are required.
- Web URLs keep the existing `/double-sudoku/` prefix. The mobile build rewrites bundled links and asset paths without changing the public website's URLs.
- Each daily/archive date has its own versioned save. The custom Play screen has one save, replaced when another custom puzzle is loaded. Numbers, original clues, and pencil notes are saved after edits, clearing, and hint placements.
- Saves use this app's local WebView storage. They are not cloud backups, do not sync with the website or other devices, and can be lost if the app is uninstalled or its data is cleared. Invalid saves and saves whose clues no longer match a daily puzzle are ignored. Storage failures show an in-app warning.
- Solver candidate eliminations and hint history are temporary and recomputed after reopening. User-entered pencil notes are preserved.
- Daily puzzles follow the device's local date and refresh after midnight or returning from the background. The existing archive remains September 2026.

## Before TestFlight

The checked-in icon and launch images are Capacitor template assets. Replace them with final branding, complete signing, and review privacy declarations and store metadata before distribution.

On a real iPhone, test airplane-mode cold launch, daily/archive/custom saves after force quit, hint placements, midnight/background transitions, small-screen layout, rotation, keyboard behavior, safe areas, and upgrading without losing saves. Browser clipboard/image-copy features also need device verification. No signed iOS binary has been built on the Windows development machine.
