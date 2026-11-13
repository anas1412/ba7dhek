// A floor, not moderation: it stops the most obvious abuse and the phrases of
// advance-fee job scams. The reports queue is the real control.
// See docs/04-launch/trust-safety.md.

const BLOCKED: string[] = [
  // Advance-fee scams: asking a candidate for money.
  "pay to apply",
  "send money",
  "registration fee",
  "frais d'inscription",
  "frais de dossier",
  "envoyer de l'argent",
  "payer pour postuler",
  "ابعث فلوس",
  "ادفع باش",
  "معلوم التسجيل",
  // Requests the data protection law forbids.
  "bulletin n3",
  "bulletin numéro 3",
  "casier judiciaire",
  "criminal record",
  "بطاقة عدد 3",
];

/** Lower-cases and removes accents and Arabic diacritics, so variants match. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ًͯ-ٰٟ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALISED = BLOCKED.map(normalise);

/** The first blocked phrase found in the text, or null when the text is clean. */
export function findBlocked(text: string): string | null {
  const haystack = normalise(text);
  const index = NORMALISED.findIndex((phrase) => haystack.includes(phrase));
  return index === -1 ? null : BLOCKED[index];
}
