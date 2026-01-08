/**
 * ErrorAlert Component
 * Displays an error alert when an error message is present.
 */

import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

interface ErrorAlertProps {
  /** Error message to display. If null/undefined, nothing is rendered. */
  error?: string | null;
  /** Title for the alert */
  title?: string;
}

export function ErrorAlert({ error, title = "Error" }: ErrorAlertProps) {
  if (!error) {
    return null;
  }

  return (
    <Alert color="red" title={title} icon={<IconAlertCircle size={16} />}>
      {error}
    </Alert>
  );
}
