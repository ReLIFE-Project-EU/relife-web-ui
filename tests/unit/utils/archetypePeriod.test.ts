import { describe, expect, test } from "vitest";

import { extractArchetypePeriod } from "../../../src/utils/archetypePeriod";

describe("extractArchetypePeriod", () => {
  test("parses legacy underscore-period names", () => {
    expect(extractArchetypePeriod("SFH_0_1945")).toBe("pre-1945");
    expect(extractArchetypePeriod("SFH_Greece_1946_1969")).toBe("1946-1969");
    expect(extractArchetypePeriod("SFH_Italy_1946_1969")).toBe("1946-1969");
    expect(extractArchetypePeriod("ES_SFH_1946_1969")).toBe("1946-1969");
  });

  test("parses hyphenated-period names from the expanded catalogue", () => {
    expect(extractArchetypePeriod("AT_SFH_0-1945")).toBe("pre-1945");
    expect(extractArchetypePeriod("AT_MFH_1980-1989")).toBe("1980-1989");
    expect(extractArchetypePeriod("AT_AB_2011-now")).toBe("2011-present");
    expect(extractArchetypePeriod("FR_AB_1990-1999")).toBe("1990-1999");
    expect(extractArchetypePeriod("MT_MFH_2000-2010")).toBe("2000-2010");
  });

  test("returns null when no period suffix is present", () => {
    expect(extractArchetypePeriod("Custom_Building_XYZ")).toBeNull();
    expect(extractArchetypePeriod("SFH_Greece")).toBeNull();
  });

  test("does not match three-digit or longer numbers", () => {
    expect(extractArchetypePeriod("SFH_Country_19460_19690")).toBeNull();
  });
});
