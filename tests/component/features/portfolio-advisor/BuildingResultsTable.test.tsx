// @vitest-environment jsdom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { BuildingResultsTable } from "../../../../src/features/portfolio-advisor/components/results/BuildingResultsTable";
import type { PRABuilding } from "../../../../src/features/portfolio-advisor/context/types";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "ResizeObserver", {
  value: ResizeObserverMock,
  writable: true,
});
afterEach(cleanup);

const building: PRABuilding = {
  id: "home-1",
  name: "Reference home",
  source: "manual",
  category: "Single Family House",
  country: "Italy",
  lat: 42,
  lng: 12,
  floorArea: 100,
  constructionPeriod: "1946-1969",
  numberOfFloors: 2,
  propertyType: "Single Family House",
  validationStatus: "valid",
};

test("building details support Enter, Space, and pointer activation exactly once", async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  const content: React.ReactElement = (
    <MantineProvider env="test">
      <BuildingResultsTable
        buildings={[building]}
        results={{ "home-1": { buildingId: "home-1", status: "pending" } }}
        onRowClick={select}
      />
    </MantineProvider>
  );
  render(content);
  const action = screen.getByRole("button", {
    name: "View breakdown for Reference home",
  });
  action.focus();
  await user.keyboard("{Enter}");
  expect(select).toHaveBeenCalledTimes(1);
  await user.keyboard(" ");
  expect(select).toHaveBeenCalledTimes(2);
  await user.click(action);
  expect(select).toHaveBeenCalledTimes(3);
  await user.click(action.closest("tr")!);
  expect(select).toHaveBeenCalledTimes(4);
  expect(select).toHaveBeenLastCalledWith(
    expect.objectContaining({ building }),
  );
});

test("building names remain plain text when no breakdown callback is supplied", () => {
  render(
    <MantineProvider env="test">
      <BuildingResultsTable
        buildings={[building]}
        results={{ "home-1": { buildingId: "home-1", status: "pending" } }}
      />
    </MantineProvider>,
  );
  expect(screen.getByText("Reference home").closest("button")).toBeNull();
});
