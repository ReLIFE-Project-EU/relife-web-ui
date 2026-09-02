/**
 * The EPC distribution band labels each class with dark ink on a pale tint of
 * its own hue. That pairing is the accessible alternative to a solid class
 * fill, so a future colour tweak silently dropping below 4.5:1 would undo the
 * reason the band is built that way.
 */

import { describe, expect, it } from "vitest";
import {
  EPC_ORDER,
  getEPCColorVar,
  getEPCInk,
  getEPCTint,
} from "../../../src/utils/epcUtils";

/** Mantine v8 `*.0` shades, resolved so contrast can be computed in a test. */
const RESOLVED_TINTS: Record<string, string> = {
  "green-0": "#EBFBEE",
  "lime-0": "#F4FCE3",
  "yellow-0": "#FFF9DB",
  "orange-0": "#FFF4E6",
  "red-0": "#FFF5F5",
};

function resolve(cssVar: string): string {
  const token = cssVar.replace("var(--mantine-color-", "").replace(")", "");
  const hex = RESOLVED_TINTS[token];
  if (!hex) throw new Error(`No resolved value for ${token}`);
  return hex;
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
}

describe("EPC band colours", () => {
  it.each(EPC_ORDER)("keeps %s legible on its own tint", (epcClass) => {
    const ratio = contrastRatio(
      getEPCInk(epcClass),
      resolve(getEPCTint(epcClass)),
    );
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("falls back to neutral colours for an unknown class", () => {
    expect(getEPCTint("Z")).toBe("var(--mantine-color-gray-0)");
    expect(getEPCInk("Z")).toBe("var(--mantine-color-gray-7)");
    expect(getEPCColorVar("Z")).toBe("var(--mantine-color-gray-6)");
  });

  it("exposes the class hue as a CSS variable for borders", () => {
    expect(getEPCColorVar("B")).toBe("var(--mantine-color-lime-6)");
  });
});
