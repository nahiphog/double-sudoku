# Windows to TestFlight

`codemagic.yaml` defines the manual `ios-testflight` workflow. It installs locked npm dependencies, runs the tests, bundles the offline game, syncs Capacitor, sets versions, signs an archive, and uploads the IPA to App Store Connect. It uses the shared `App` scheme and Swift Package Manager, with no CocoaPods step.

Account setup below is performed in your Windows browser. No local Mac is required. A paid Apple Developer membership and access to Codemagic's macOS build machines are required; check the account's current build allowance/pricing before starting.

## 1. Publish the prepared source to GitHub

In GitHub Desktop, review the repository changes, commit the intended game/iOS/configuration files, and push to `nahiphog/double-sudoku`. Include `codemagic.yaml`, `package-lock.json`, the source assets, build scripts, and `ios/`, including the shared scheme. The mobile build currently includes Triple Sudoku files too, so those source files must accompany the build script.

Do not commit signing keys, certificates, profiles, or generated `node_modules`/`dist` files. The Git ignore rules cover the common credential extensions. The workflow configuration is local until you push it.

## 2. Connect Codemagic to GitHub

Sign in at [Codemagic](https://codemagic.io/). Add an application, connect GitHub, and grant access to the `double-sudoku` repository. Choose that repository and YAML configuration (or the equivalent Other/framework option). Scan the branch containing `codemagic.yaml`. The workflow should appear as **Double Sudoku - TestFlight upload**. Do not start it until signing is ready. [Repository setup guide](https://docs.codemagic.io/getting-started/adding-apps/)

## 3. Register the app with Apple

In [Apple Developer](https://developer.apple.com/account/), open Certificates, Identifiers & Profiles. Under Identifiers, register an explicit App ID for `com.nahiphog.doublesudoku`. Use the same Apple team for everything below.

In [App Store Connect](https://appstoreconnect.apple.com/), create an iOS app named Double Sudoku (subject to availability), select that bundle ID, choose English, and use an internal SKU such as `double-sudoku-ios`. If you change the bundle ID, update `capacitor.config.json`, both Xcode target configurations, and `environment.ios_signing.bundle_identifier` in the YAML before building. [Apple app-record guide](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/)

## 4. Create the API connection

In App Store Connect, open Users and Access > Integrations > App Store Connect API. Request API access as the Account Holder if needed. Generate a **team API key** for Codemagic with **App Manager** access. Save the downloaded `.p8` file, Key ID, and Issuer ID securely. The private key is only downloadable once. [Apple API access](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/)

In Codemagic Team settings > Team integrations > Developer Portal, add the key using the name **`double-sudoku-apple`**. Enter the Issuer ID and Key ID and upload the `.p8`. This name must match the YAML integration. Credentials go into Codemagic, not chat or Git. [Publishing authentication](https://docs.codemagic.io/yaml-publishing/app-store-connect/)

## 5. Set up the signing certificate and profile

In Codemagic Team settings > codemagic.yaml settings > Code signing identities > iOS certificates, generate an **Apple Distribution** certificate using your integration. Give it a reference name such as `double-sudoku-distribution`. Save its download and password, then upload the certificate if the UI requires it. Keep the private-key backup. If Apple reports a certificate limit, reuse a suitable certificate with its private key rather than revoking an actively used one. [Codemagic signing](https://docs.codemagic.io/yaml-code-signing/signing-ios/)

Back in Apple Developer > Profiles, create an **App Store Connect** distribution profile. Select the explicit app ID and the distribution certificate you just generated. Name it `Double Sudoku App Store` and download the `.mobileprovision` file. No iPhone UDID is needed for this distribution type. [Apple profile instructions](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/)

In Codemagic's iOS provisioning profiles tab, upload that profile with a reference such as `double-sudoku-app-store`. Confirm it shows a matching certificate. The YAML selects signing files by bundle ID and distribution type, so the reference names need not appear in the YAML.

## 6. Build and install

Start a build on the branch you pushed and select `ios-testflight`. Success should produce `build/ios/ipa/App.ipa` and an App Store Connect upload. Native compilation and upload cannot be validated from this Windows workspace; the first cloud run is the end-to-end check.

After Apple finishes processing, resolve any export-compliance prompt in the app's TestFlight tab. Create an internal group, add yourself and the build, then accept the invitation using Apple's TestFlight app on your iPhone. [Internal testing guide](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/)

`submit_to_testflight: false` deliberately disables automatic external beta-review submission; it does not disable the upload. Assign internal testers in Apple's UI. External testing can be configured later after supplying beta-review information. Public App Store submission is also disabled.

## Updates and troubleshooting

- Push changes and manually run the workflow again. The marketing version comes from `package.json`; the build number is Codemagic's project counter plus `BUILD_NUMBER_OFFSET` (initially zero). If migrating an app with existing uploads or recreating the Codemagic application, increase the offset so new numbers exceed Apple's latest upload. Avoid simultaneous release builds. [Versioning guide](https://docs.codemagic.io/knowledge-codemagic/build-versioning/)
- Integration not found: check the exact `double-sudoku-apple` name and that the integration belongs to the app's Codemagic team.
- No matching signing identity: verify the profile is App Store distribution, matches the bundle ID, and includes the stored certificate whose private key Codemagic holds.
- Scheme not found: ensure `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` was committed.
- Package resolution failure: inspect the Swift Package Manager logs; do not add CocoaPods as a workaround.
- Upload fails: check the Apple app record, agreements, key permissions, and build number. Build logs are retained as artifacts.
- Uploaded but unavailable: inspect Apple's processing/compliance state, then assign the build to the internal group.

The workflow selects Codemagic's latest stable Xcode image. You can pin a supported image version later for reproducibility. Browser tests currently require Edge and are not run on this Mac workflow; run them on Windows. Icons and launch artwork remain placeholders, and real-iPhone offline/save/layout testing is still required.
