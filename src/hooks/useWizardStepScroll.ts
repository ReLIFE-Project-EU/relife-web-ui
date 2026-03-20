import { useEffect, useRef, type RefObject } from "react";

interface UseWizardStepScrollOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
}

export function useWizardStepScroll(
  currentStep: number,
  topRef: RefObject<HTMLElement | null>,
  options: UseWizardStepScrollOptions = {},
) {
  const previousStepRef = useRef<number | null>(null);
  const { behavior = "smooth", block = "start" } = options;

  useEffect(() => {
    const previousStep = previousStepRef.current;

    if (previousStep !== null && currentStep > previousStep) {
      requestAnimationFrame(() => {
        topRef.current?.scrollIntoView({ behavior, block });
      });
    }

    previousStepRef.current = currentStep;
  }, [block, behavior, currentStep, topRef]);
}
