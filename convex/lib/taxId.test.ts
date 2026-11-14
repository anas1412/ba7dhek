import { describe, expect, test } from "vitest";
import { normaliseTaxId, taxIdBase } from "./taxId";

describe("normaliseTaxId", () => {
  test("accepts the full form however it is punctuated", () => {
    expect(normaliseTaxId("0000120H/P/M/000")).toBe("0000120H/P/M/000");
    expect(normaliseTaxId("0000120 H P M 000")).toBe("0000120H/P/M/000");
    expect(normaliseTaxId("0000120-H-P-M-000")).toBe("0000120H/P/M/000");
    expect(normaliseTaxId("0000120hpm000")).toBe("0000120H/P/M/000");
    expect(normaliseTaxId("  1234567A/A/M/001 ")).toBe("1234567A/A/M/001");
  });

  test("accepts the short form of seven digits and the key letter", () => {
    expect(normaliseTaxId("1234567A")).toBe("1234567A");
    expect(normaliseTaxId("1234567 a")).toBe("1234567A");
  });

  test("restores leading zeros that printed forms drop", () => {
    expect(normaliseTaxId("120H/P/M/000")).toBe("0000120H/P/M/000");
    expect(normaliseTaxId("120H")).toBe("0000120H");
  });

  test("refuses key letters that are never used", () => {
    expect(normaliseTaxId("1234567I")).toBeNull();
    expect(normaliseTaxId("1234567O")).toBeNull();
    expect(normaliseTaxId("1234567U")).toBeNull();
  });

  test("refuses an unknown VAT code", () => {
    expect(normaliseTaxId("1234567A/X/M/000")).toBeNull();
  });

  test("refuses anything that is not shaped like a tax ID", () => {
    expect(normaliseTaxId("")).toBeNull();
    expect(normaliseTaxId("1234567")).toBeNull();
    expect(normaliseTaxId("12345678A")).toBeNull();
    expect(normaliseTaxId("ABCDEFGH")).toBeNull();
    expect(normaliseTaxId("1234567A/A/M")).toBeNull();
    expect(normaliseTaxId("1234567A/A/M/00")).toBeNull();
    expect(normaliseTaxId("1234567A/A/M/0000")).toBeNull();
    expect(normaliseTaxId("Hôtel Les Orangers")).toBeNull();
  });
});

describe("taxIdBase", () => {
  test("is the same for every establishment of one taxpayer", () => {
    expect(taxIdBase("1234567A/A/M/000")).toBe("1234567A");
    expect(taxIdBase("1234567A/A/M/002")).toBe("1234567A");
    expect(taxIdBase("1234567A")).toBe("1234567A");
  });
});
