import { PACKAGE_SELECTION_MAX } from "../../constants";
import type {
  PackageFinancialInput,
  PackageFinancialInputsById,
} from "../../context/types";

export function hasValidPackageFinancialInput(
  input: PackageFinancialInput | undefined,
): boolean {
  return (
    input !== undefined &&
    input.capex !== null &&
    input.capex > 0 &&
    input.annualMaintenanceCost !== null &&
    input.annualMaintenanceCost >= 0
  );
}

export function areSelectedPackagesReady(
  selectedPackageIds: string[],
  packageFinancialInputs: PackageFinancialInputsById,
): boolean {
  return (
    selectedPackageIds.length > 0 &&
    selectedPackageIds.length <= PACKAGE_SELECTION_MAX &&
    selectedPackageIds.every((packageId) =>
      hasValidPackageFinancialInput(packageFinancialInputs[packageId]),
    )
  );
}
