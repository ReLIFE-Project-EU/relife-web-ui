import { describe, expect, test } from "vitest";

import { mapWithConcurrencyLimit } from "../../../src/utils/concurrency";

describe("mapWithConcurrencyLimit", () => {
  test("preserves result order while limiting active workers", async () => {
    let active = 0;
    let maxActive = 0;

    const results = await mapWithConcurrencyLimit(
      [30, 10, 20, 5],
      2,
      async (delayMs, index) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        active -= 1;
        return `item-${index}`;
      },
    );

    expect(maxActive).toBeLessThanOrEqual(2);
    expect(results).toEqual(["item-0", "item-1", "item-2", "item-3"]);
  });

  test("propagates mapper failures", async () => {
    await expect(
      mapWithConcurrencyLimit([1, 2, 3], 2, async (item) => {
        if (item === 2) {
          throw new Error("failed");
        }
        return item;
      }),
    ).rejects.toThrow("failed");
  });

  test("rejects invalid concurrency limits", async () => {
    await expect(
      mapWithConcurrencyLimit([1], 0, async (item) => item),
    ).rejects.toThrow("Concurrency limit must be a positive integer");
  });
});
