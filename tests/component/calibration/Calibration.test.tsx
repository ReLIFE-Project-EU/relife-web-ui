// @vitest-environment jsdom
import React from "react";
import { MantineProvider } from "@mantine/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Calibration } from "../../../src/routes/Calibration";
import { theme } from "../../../src/theme";

const { runCalibration } = vi.hoisted(() => ({ runCalibration: vi.fn() }));
vi.mock(
  "../../../src/features/calibration/services/calibrationService",
  () => ({
    runCalibration,
    errorMessage: (error: unknown) => String(error),
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
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
afterEach(cleanup);

test("calibration renders without starting a run", () => {
  const content: React.ReactElement = (
    <MantineProvider theme={theme} env="test">
      <Calibration />
    </MantineProvider>
  );
  const { container } = render(content);
  expect(container.firstElementChild).not.toBeNull();
  expect(runCalibration).not.toHaveBeenCalled();
});
