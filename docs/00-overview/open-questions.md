# Open questions

Most earlier questions are now settled; see [decisions.md](decisions.md). What remains cannot be decided at a desk. Each item needs an answer from an outside body, an attempt in the real world, or a fact only the developer has.

## Needs an outside answer

### Will the data protection authority authorise hosting abroad?
- **Why it matters:** Tunisian law requires authorisation before personal data leaves the country, and silence after a month counts as refusal. All of the app's data is hosted abroad.
- **How to settle it:** file the declaration and the transfer request, with the written question on art. 22. See [data-protection.md](../04-launch/data-protection.md).
- **If the answer is no:** the backend must move to Tunisian hosting. That is a large change, which is why this is asked first.

### Where does the line between advertising and placement fall?
- **Why it matters:** private placement offices are abolished; job advertisements are permitted. The app is designed as an advertising medium.
- **How to settle it:** a Tunisian labour lawyer's opinion. Needed before any feature that selects or scores candidates, and before charging employers.
- **Until then:** the limits in [tunisia-constraints.md](../04-launch/tunisia-constraints.md) hold.

### Has the new data protection law passed?
- **Status:** a draft was in parliamentary committee through 2026. Not confirmed after August 2026.
- **How to settle it:** check before launch. If it has passed, re-read [data-protection.md](../04-launch/data-protection.md) against it.

## Needs to be tried

### The Google Play fee
- **Settled by Anas (2026-11-13):** a friend abroad pays the 25 USD registration, so the tech card question no longer blocks anything.
- **One thing to check when registering:** the developer account and its identity verification are in Anas's name while the card is someone else's. Whether Google accepts that combination is unverified.

### iOS
- **Deferred by Anas (2026-11-13):** enrolment, payment and timing for iOS are his to decide later. Nothing in the Android plan depends on them.
- The one fixed point is Apple's rule that Google cannot be the only login on iOS; see [decisions.md](decisions.md).

### Is `ba7dhek.tn` available, and is the name free on the stores?
- **How to settle it:** search a Tunisian registrar, Google Play and the App Store. A trademark search with the Tunisian institute (INNORPI) is the thorough version.

### The three technical spikes
See [spikes.md](../03-build/spikes.md): sign-in through Clerk into Convex on a development build, the feed query on seeded data, and a real push from the fan-out.

## Needs a fact only the developer has

### Which part of Hammamet?
- **Settled:** the pilot city is Hammamet.
- **Still needed:** the district, meaning where the anchor hotel is. It sets the default map position and where the first employers are recruited.

### Who writes the Tunisian dialect copy?
- The Arabic interface is in dialect and should be written by a native speaker, with a consistent spelling list. The developer may be that person.

### Is there a registered company, or will there be one?
- A company would change three things: the tech card ceiling (10,000 TND), the Play account type (no 12-tester test), and the Clerk and store identities. The plan assumes there is none.
