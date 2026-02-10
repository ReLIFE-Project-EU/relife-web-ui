/**
 * StepNavigation Component
 * Provides consistent navigation buttons for wizard steps.
 */

import { Button, Group } from "@mantine/core";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalculator,
} from "@tabler/icons-react";

interface StepNavigationProps {
  /** Current step index (0-based) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Callback for going to previous step */
  onPrevious?: () => void;
  /** Callback for going to next step (if not using primary action) */
  onNext?: () => void;
  /** Primary action callback (replaces Next on certain steps) */
  onPrimaryAction?: () => void;
  /** Label for the primary action button */
  primaryActionLabel?: string;
  /** Whether the primary action is loading */
  isLoading?: boolean;
  /** Whether navigation is disabled */
  disabled?: boolean;
  /** Whether the primary action should be disabled */
  primaryDisabled?: boolean;
}

export function StepNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onPrimaryAction,
  primaryActionLabel,
  isLoading = false,
  disabled = false,
  primaryDisabled = false,
}: StepNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // Use primary action if provided, otherwise use standard next
  const hasPrimaryAction = onPrimaryAction && primaryActionLabel;

  return (
    <Group justify="space-between" mt="xl">
      {/* Previous button (hidden on first step but takes space for alignment) */}
      <div>
        {!isFirstStep && (
          <Button
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onPrevious}
            disabled={disabled || isLoading}
          >
            Previous
          </Button>
        )}
      </div>

      {/* Next / Primary Action button */}
      <div>
        {hasPrimaryAction ? (
          <Button
            leftSection={<IconCalculator size={16} />}
            onClick={onPrimaryAction}
            loading={isLoading}
            disabled={disabled || primaryDisabled}
          >
            {primaryActionLabel}
          </Button>
        ) : !isLastStep ? (
          <Button
            rightSection={<IconArrowRight size={16} />}
            onClick={onNext}
            disabled={disabled || isLoading}
          >
            Next
          </Button>
        ) : null}
      </div>
    </Group>
  );
}

/**
 * Simple back button for use outside the main navigation.
 */
interface BackButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function BackButton({ onClick, disabled }: BackButtonProps) {
  return (
    <Button
      variant="subtle"
      leftSection={<IconArrowLeft size={16} />}
      onClick={onClick}
      disabled={disabled}
      size="sm"
    >
      Back
    </Button>
  );
}
