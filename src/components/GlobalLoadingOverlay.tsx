/**
 * GlobalLoadingOverlay Component
 *
 * Application-wide loading overlay that renders in a Portal
 * with fixed positioning to cover the entire viewport.
 */

import { LoadingOverlay, Portal } from "@mantine/core";
import { useGlobalLoadingState } from "../contexts/global-loading";

/**
 * GlobalLoadingOverlay
 *
 * Displays a full-screen loading overlay when any loading operation is active.
 * Uses Portal to render outside the normal DOM hierarchy, ensuring it covers
 * all other content including modals and fixed elements.
 *
 * Place this component once at the application level (e.g., in Layout).
 */
export function GlobalLoadingOverlay() {
  const { isLoading } = useGlobalLoadingState();

  return (
    <Portal>
      <LoadingOverlay
        visible={isLoading}
        zIndex={1000}
        overlayProps={{ blur: 2 }}
        style={{
          position: "fixed",
          inset: 0,
        }}
      />
    </Portal>
  );
}
