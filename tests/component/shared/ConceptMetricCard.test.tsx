// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { ConceptMetricCard } from "../../../src/components/shared/ConceptMetricCard";
import { relifeConcepts } from "../../../src/constants/relifeConcepts";
import { theme } from "../../../src/theme";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
afterEach(cleanup);

test("concept card keeps block content outside paragraphs and exposes its explainer", async () => {
  const user = userEvent.setup();
  const value: React.ReactElement = <div data-testid="rich-value">€1,000</div>;
  const { container } = render(
    <MantineProvider theme={theme}>
      <ConceptMetricCard
        conceptId="investment"
        descriptionVisible
        prefix="Total"
        value={value}
      />
    </MantineProvider>,
  );
  expect(screen.getByTestId("rich-value").closest("p")).toBeNull();
  expect(container.querySelector("p div")).toBeNull();
  expect(screen.getByText("Total")).toBeTruthy();
  await user.hover(screen.getByLabelText(/Explain /));
  await waitFor(() =>
    expect(
      screen.getAllByText(relifeConcepts.investment.description),
    ).toHaveLength(2),
  );
});
