# Logo

**Status:** first version, drawn in code on 2026-11-14. Seen as rendered image files and in the browser preview. Not yet seen on a phone's home screen or as a splash screen: both need a new build, and the splash screen needs a preview build, not a development build.

## The idea

Ba7dhek means "next to you". The mark shows exactly that and nothing else:

- a **map pin**: the job, at a real place;
- an **amber dot** beside the foot of the pin: you, right next to it.

Amber is the colour the app already reserves for distance. The dot in the logo is the same amber as the "650 m from you" chip on every job card, so the logo and the product say the same thing in the same colour.

There is no letter in the mark. A letter would have to be Arabic or Latin, and the app is both.

## Rules

| Rule | Reason |
|---|---|
| The pin is white on blue, or blue on a light ground. The dot is always amber | Amber means proximity, here and in the app |
| In one-colour use (Android themed icons) the dot takes the pin's colour | The system recolours the whole shape; the gap between pin and dot keeps them apart |
| The mark does not mirror in Arabic | It is a picture of two things side by side, not a direction |
| The name beside the mark is set in Readex Pro 600: "Ba7dhek" or "بحذاك" | Same typeface as the app; no separate wordmark drawing |
| Clear space around the mark: at least the dot's diameter | Keeps it legible in small sizes |
| No gradients, shadows or outlines | It has to survive 48 px and one-colour printing |

## Files

Everything is generated from one drawing by `npm run icons` (`scripts/make-icons.mjs`). The image files are committed, so a build does not need to run the script.

| File | Used for | Content |
|---|---|---|
| `assets/brand/logo-mark.svg` | The source, for print or a store listing | Blue pin, amber dot, no ground |
| `assets/images/icon.png` | App icon on iOS and the default elsewhere | 1024 px, blue ground edge to edge, white pin, amber dot |
| `assets/images/android-icon-foreground.png` | Android adaptive icon, front layer | 1024 px, transparent, mark inside the middle two thirds so no launcher shape crops it |
| `assets/images/android-icon-monochrome.png` | Android 13+ themed icon | Same shape in one colour |
| `assets/images/splash-icon.png` | Splash screen | White pin and amber dot, transparent |
| `assets/images/favicon.png` | Browser tab in the development preview | 48 px, blue ground |
| `assets/images/logo-mark.png` | Inside the app (welcome page) | Blue pin and amber dot, transparent |
| `assets/images/logo-mark-dark.png` | Inside the app in dark mode | Lighter blue pin, to match the dark theme's brand colour |

The Android adaptive icon's back layer is the plain brand blue, set as a colour in `app.json`, not an image.

## In the app

- **Welcome page:** the mark above the name.
- **Splash screen:** the mark centred on brand blue; on dark mode, on the dark ground.
- Nowhere else. The header bar stays quiet, and a logo on every screen would be decoration.

## Not done

- **iOS.** The icon uses the single `icon.png`. Dark and tinted variants, or an Icon Composer file, are left for when iOS is decided.
- **Store graphics** (Play feature graphic, screenshots): made at store-listing time.
- **Illustrations** for empty states: a separate piece of phase G.
- **A trademark and store-name check** for "Ba7dhek" is still open; see `docs/00-overview/open-questions.md`.
