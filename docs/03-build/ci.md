# Automated checks and builds on GitHub

**Status (2026-11-14):** the checks workflow runs on every push and has passed. The build workflow has built a working `dev` APK (67.6 MB, about 36 minutes with an empty cache); the first publish of a file failed for the storage reason below and the workflow was changed to publish to releases.

Two workflows, in `.github/workflows/`.

## Checks (`checks.yml`)

Runs on every push to `main` and on every pull request. It does what `npm run check` and `npx expo lint` do on a computer: translations complete in three languages, types, tests, lint. A few minutes, no secrets.

## Build apps (`build.yml`)

Builds the Android app on GitHub's machines with `eas build --local`, so it does not use up Expo's monthly build allowance. Each file is named:

```
ba7dhek-v<version>-<variant>-<commit>.<apk|aab>
```

| Variant | What it is | Backend | Profile in `eas.json` | File |
|---|---|---|---|---|
| `devclient` | Development build, for whoever writes the code. Needs the dev server running | dev | `development` | `.apk` |
| `dev` | The app as a tester would install it | dev | `staging` | `.apk` |
| `prod` | The app as a tester would install it | production | `preview` | `.apk` |
| `store` | The file Google Play asks for | production | `production` | `.aab` |

Example: `ba7dhek-v0.1.0-prod-06efbde.apk`.

**Two ways to start it**

- **By hand:** GitHub, Actions tab, "Build apps", "Run workflow", choose a variant (or `all`). The file is published to a pre-release named after the variant (`build-dev`, `build-prod`, `build-devclient`, `build-store`), which each new build of that variant replaces. So the page `github.com/anas1412/ba7dhek/releases/tag/build-dev` always holds the newest dev build.
- **By tag:** push a tag such as `v0.1.0`. It builds `dev`, `prod` and `store` and attaches all three to a GitHub release of that name.

```bash
git tag v0.1.0
```

```bash
git push origin v0.1.0
```

The version in the file name comes from `version` in `app.json`; change it there before tagging.

## Publish update (`update.yml`)

Sends code-only changes to apps already installed, with EAS Update, so no new APK is needed.

- **Automatic:** every push to `main` that touches `src/`, `assets/`, `app.json` or the package files publishes to channel `dev`, which the dev APKs listen to. It takes a few minutes.
- **By hand, for prod:** Actions → "Publish update" → Run workflow → channel `prod`. The prod APKs pick it up.
- On the phone: the app downloads the update when it starts and runs it from the next start. So open the app, close it fully, open it again.
- A change to native code or native config (a new native library, a plugin or permission in `app.json`) gives a new runtime version. Older APKs ignore updates for it, and a new APK from "Build apps" is needed.
- Each update is named after its commit (short id and subject). They are listed on expo.dev under the project's Updates page.

Details: [eas.md](eas.md#eas-update-set-up-2026-11-14).

## Why releases and not Actions artifacts

GitHub's storage for Actions artifacts is counted per account, across every repository, and on 2026-11-14 it was full, used by other repositories. Files attached to releases do not count against that storage. The repository has been public since 2026-11-14, so anyone can download its release files. They contain no secrets: the backend addresses inside the app are public by nature.

## Speed

- Only the two architectures real phones use are compiled (64-bit and 32-bit ARM), not the two emulator ones.
- Gradle's cache is saved after each successful build and restored by the next.
- The build step stops at 100 minutes and the job at 120, so a slow build fails with its log intact; on failure the end of the log is shown on the run's summary page.

## What Anas has to do once

1. Create an access token at expo.dev: account settings, Access tokens. The build uses it to fetch the Android signing key that Expo keeps for the project.
2. Add it to the repository as a secret named `EXPO_TOKEN`:

```bash
gh secret set EXPO_TOKEN
```

That command asks for the value and does not print it. Without the secret the build stops at its first step with a message saying so.

The signing key must already exist on Expo's side, which it does once one Android build has been made through EAS. If it does not, the build says so, and one `eas build -p android` from a computer creates it.

## All variants are the same app

Every variant has the same name and package id, `tn.ba7dhek.app`. A phone holds one at a time: installing `prod` replaces `dev`. Android also refuses to replace an app with a file signed by a different key, which is why every variant is signed with the one key.

## iOS

**Not possible for a phone yet.** An iPhone build has to be signed with a paid Apple Developer account, and there is none. This is Anas's decision to make later.

What exists: an optional tick box when starting the build by hand, "Also build for the iOS simulator". It produces an app for the simulator on a Mac. It cannot be installed on an iPhone, and it has never run. It uses a Mac machine, which GitHub counts at ten times the minutes of a Linux one on a private repository.

When an Apple account exists, the device build is one more job in the same file, plus Apple credentials as secrets.

## Cost

The repository is private, so GitHub's free allowance of Actions minutes applies (2,000 a month on the free plan; this figure is from memory and was not re-checked on 2026-11-14). An Android build was not timed, since none has run.
