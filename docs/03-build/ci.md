# Automated checks and builds on GitHub

**Status (2026-11-14):** the checks workflow runs on every push. The build workflow is written and has **never run**: it needs a secret only Anas can create (below), so whether it produces a working file is unverified.

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

- **By hand:** GitHub, Actions tab, "Build apps", "Run workflow", choose a variant (or `all`). The file appears under the run as an artifact, kept 30 days.
- **By tag:** push a tag such as `v0.1.0`. It builds `dev`, `prod` and `store` and attaches all three to a GitHub release of that name.

```bash
git tag v0.1.0
```

```bash
git push origin v0.1.0
```

The version in the file name comes from `version` in `app.json`; change it there before tagging.

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
