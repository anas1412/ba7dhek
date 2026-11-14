# Logo

**Status:** chosen by Anas on 2026-11-14. Seen as rendered image files, in each icon shape, and on the welcome page in the browser. Not yet seen on a phone's home screen or as a splash screen: both need a new build, and the splash screen needs a preview build, not a development build.

## The idea

The mark is the name itself: **بحذاك**, in white on brand blue, with the dot under the **ب** in **amber**. Anas chose it on 2026-11-14 from four rendered candidates.

- The word is the brand. Anyone who reads Arabic reads the name straight off the icon.
- The amber dot is the one accent. Amber is the colour the app reserves for distance: it is the same amber as the "650 m from you" chip on every job card.
- The letters are Readex Pro Bold, the app's own typeface, so the logo and the interface are cut from the same shapes.

Two earlier versions were dropped: a plain map pin with a dot (too generic), and the single letter ب with a map pin for its dot.

## Rules

| Rule | Reason |
|---|---|
| Word white on brand blue; the ب's dot always amber; the ذ's dot stays white | One accent, and it means proximity |
| On a light ground, use the blue tile, not a bare blue word | The tile is what people will know from their home screen |
| In one-colour use (Android themed icons) the dot takes the word's colour | The system recolours the whole shape |
| The mark never mirrors and is never translated | It is a word in Arabic script |
| Beside the tile, "Ba7dhek" is set in Readex Pro Bold in ink | For readers who do not read Arabic; one typeface everywhere |
| Clear space around the tile: at least a quarter of its width | Keeps it legible in small sizes |
| No gradients, shadows or outlines | It has to survive small sizes and one-colour printing |

**Known weakness:** five letters are small at 48 px. In a browser tab the word is a texture more than a text. On a phone's home screen the icon is larger and it reads.

## Files

Everything is drawn by `npm run icons` (`scripts/make-icons.mjs`), which sets the word in the typeface, joined as Arabic is written, and colours the one dot. The image files are committed, so a build does not need to run the script.

| File | Used for | Content |
|---|---|---|
| `assets/images/icon.png` | App icon on iOS and the default elsewhere | 1024 px, blue edge to edge |
| `assets/images/android-icon-foreground.png` | Android adaptive icon, front layer | Transparent; the word stays inside the middle two thirds so no launcher shape crops it |
| `assets/images/android-icon-monochrome.png` | Android 13+ themed icon | The same shape in one colour |
| `assets/images/splash-icon.png` | Splash screen, light mode | White word, amber dot, on brand blue set in `app.json` |
| `assets/images/splash-icon-dark.png` | Splash screen, dark mode | Lighter blue word on the dark ground |
| `assets/images/favicon.png` | Browser tab in the development preview | 48 px tile |
| `assets/images/logo-mark.png` | Inside the app | The tile with rounded corners, 512 px |
| `assets/brand/logo-mark.svg` | Print, store listing | The tile, as a drawing that scales |
| `assets/brand/logo-lockup.svg`, `.png` | Store listing, slides, documents | The tile with "Ba7dhek" beside it |

The Android adaptive icon's back layer is the plain brand blue, set as a colour in `app.json`, not an image.

## In the app

- **Welcome page:** the tile above the name.
- **Splash screen:** the mark centred on brand blue; in dark mode, on the dark ground.
- Nowhere else. The header bar stays quiet, and a logo on every screen would be decoration.

## Not done

- **Other people's eyes.** Only its author has judged it. Show it to a few people in Hammamet before any printing.
- **iOS.** The icon uses the single `icon.png`. Dark and tinted variants, or an Icon Composer file, are left for when iOS is decided.
- **Store graphics** (Play feature graphic, screenshots): made at store-listing time, from the lockup.
- **Illustrations** for empty states: a separate piece of phase G.
- **A trademark and store-name check** for "Ba7dhek" is still open; see `docs/00-overview/open-questions.md`.
