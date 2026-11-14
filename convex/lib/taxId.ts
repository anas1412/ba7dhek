// The Tunisian tax ID (matricule fiscal). Pure, so the app's form and the
// backend apply the same rule.
//
// Shape, as published: NNNNNNNX/X/X/NNN
//   NNNNNNN  seven digits (printed forms sometimes drop leading zeros)
//   X        a key letter, never I, O or U
//   X        the VAT code: A, B, P, D or N
//   X        a category letter (M for a company, P for a person, and others)
//   NNN      the establishment number, 000 for the head office
//
// The short form, seven digits and the key letter, is also accepted, since
// that is what many businesses quote.
//
// This checks the shape only. The key letter's formula is not published, so a
// well-formed number can still be invented; a person checks it before a
// business is approved.

const SHAPE = /^(\d{1,7})([A-HJ-NP-TV-Z])(?:([ABDNP])([A-Z])(\d{3}))?$/;

/**
 * Returns the tax ID in one canonical form ("0000120H/P/M/000" or "0000120H"),
 * or null when the text is not shaped like one. Spaces, slashes, dots and
 * dashes in the input are ignored, as is letter case.
 */
export function normaliseTaxId(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s/.\-_]/g, "");
  const match = SHAPE.exec(compact);
  if (!match) return null;
  const [, digits, key, vat, category, establishment] = match;
  const base = `${digits.padStart(7, "0")}${key}`;
  return vat ? `${base}/${vat}/${category}/${establishment}` : base;
}

/** The part that identifies the taxpayer, shared by all of its establishments. */
export function taxIdBase(canonical: string): string {
  return canonical.slice(0, 8);
}
