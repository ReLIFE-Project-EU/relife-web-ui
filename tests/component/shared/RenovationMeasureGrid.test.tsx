// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { RenovationMeasureGrid } from "../../../src/components/shared/RenovationMeasureGrid";
import { BuildingMeasuresModal } from "../../../src/features/portfolio-advisor/components/BuildingMeasuresModal";
import type { PRABuilding } from "../../../src/features/portfolio-advisor/context/types";
import {
  MEASURE_CATEGORIES,
  RENOVATION_MEASURES,
} from "../../../src/services/mock/data/renovationMeasures";
import type { RenovationMeasureId } from "../../../src/types/renovation";
import { theme } from "../../../src/theme";

vi.mock(
  "../../../src/features/portfolio-advisor/hooks/usePortfolioAdvisorServices",
  () => ({
    usePortfolioAdvisorServices: () => ({
      renovation: {
        getCategories: () => MEASURE_CATEGORIES,
        getMeasuresByCategory: (category: string) =>
          RENOVATION_MEASURES.filter((m) => m.category === category),
        getAnalysisEligibleMeasures: () =>
          RENOVATION_MEASURES.filter((m) => m.id !== "pv"),
        getMeasure: (id: string) =>
          RENOVATION_MEASURES.find((m) => m.id === id),
      },
    }),
  }),
);
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
afterEach(cleanup);

function Grid(): React.ReactElement {
  const [selected, setSelected] = useState<RenovationMeasureId[]>([]);
  return (
    <RenovationMeasureGrid
      categories={MEASURE_CATEGORIES}
      measures={RENOVATION_MEASURES}
      selectedIds={selected}
      eligibleIds={[
        "condensing-boiler",
        "air-water-heat-pump",
        "wall-insulation",
      ]}
      onToggle={(id) =>
        setSelected((prev) =>
          prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
        )
      }
    />
  );
}

describe("shared renovation controls", () => {
  test("card and keyboard toggles enforce conflicts and allow deselection", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <Grid />
      </MantineProvider>,
    );
    const boiler = screen.getByRole("button", { name: /Condensing Boiler/ });
    const heatPump = screen.getByRole("button", {
      name: /Air-Water Heat Pump/,
    });
    await user.click(boiler);
    expect(heatPump.getAttribute("aria-disabled")).toBe("true");
    await user.click(boiler);
    expect(heatPump.getAttribute("aria-disabled")).toBe("false");
    heatPump.focus();
    await user.keyboard("{Enter}");
    expect(boiler.getAttribute("aria-disabled")).toBe("true");
    await user.keyboard(" ");
    expect(boiler.getAttribute("aria-disabled")).toBe("false");
    expect(
      screen
        .getByRole("button", { name: /PV Panels/ })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  test("per-building modal saves an override and resets to portfolio defaults", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(),
      onReset = vi.fn(),
      onClose = vi.fn();
    const building: PRABuilding = {
      id: "a",
      name: "A",
      source: "manual",
      category: "SFH",
      country: "Italy",
      lat: 42,
      lng: 12,
      floorArea: 100,
      constructionPeriod: "1961-1980",
      numberOfFloors: 2,
      propertyType: "SFH",
      validationStatus: "valid",
      selectedMeasures: ["condensing-boiler"],
    };
    render(
      <MantineProvider theme={theme}>
        <BuildingMeasuresModal
          building={building}
          opened
          onClose={onClose}
          onSave={onSave}
          onReset={onReset}
          globalMeasures={["wall-insulation"]}
        />
      </MantineProvider>,
    );
    const heatPump = screen.getByRole("checkbox", {
      name: "Air-Water Heat Pump",
    }) as HTMLInputElement;
    expect(heatPump.disabled).toBe(true);
    await user.click(
      screen.getByRole("checkbox", { name: "Condensing Boiler" }),
    );
    expect(
      (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await user.click(heatPump);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("a", ["air-water-heat-pump"]);
    await user.click(
      screen.getByRole("button", { name: "Reset to Portfolio Default" }),
    );
    expect(onReset).toHaveBeenCalledWith("a");
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
