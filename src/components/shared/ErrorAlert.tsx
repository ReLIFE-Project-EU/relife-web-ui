/**
 * ErrorAlert Component
 * Displays an alert when an error or notice message is present.
 *
 * Defaults to a red "error" rendering. Callers can pass a `color` prop to
 * reuse the same component for warning ("yellow") or info banners — used by
 * the HRA Results step for low-confidence and unusable estimation diagnostics.
 */

import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface ErrorAlertProps {
  /** Message or content to display. If null/undefined, nothing is rendered. */
  error?: ReactNode | string | null;
  /** Title for the alert */
  title?: string;
  /** Mantine color (defaults to "red"). */
  color?: string;
}

export function ErrorAlert({
  error,
  title = "Error",
  color = "red",
}: ErrorAlertProps) {
  if (!error) {
    return null;
  }

  return (
    <Alert color={color} title={title} icon={<IconAlertCircle size={16} />}>
      {error}
    </Alert>
  );
}
