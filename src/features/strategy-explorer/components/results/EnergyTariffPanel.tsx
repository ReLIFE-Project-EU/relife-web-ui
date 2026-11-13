import { EnergyTariffPanel as SharedEnergyTariffPanel } from "../../../../components/shared/EnergyTariffPanel";
import { useRSEWorkflow } from "../../hooks/useRSEWorkflow";
import { useStrategyExplorer } from "../../hooks/useStrategyExplorer";
import type { EnergyTariffOverrides } from "../../../../services/energyTariffService";

export function EnergyTariffPanel() {
  const { state, dispatch, gasTariff, electricityTariff } =
    useStrategyExplorer();
  const { run, isRunning } = useRSEWorkflow();

  const handleApply = async (tariffs: EnergyTariffOverrides) => {
    const gasTariffEurPerKwh =
      tariffs.gasTariffEurPerKwh ?? gasTariff.reference.eurPerKwh;
    const electricityTariffEurPerKwh =
      tariffs.electricityTariffEurPerKwh ??
      electricityTariff.reference.eurPerKwh;
    if (gasTariffEurPerKwh === null || electricityTariffEurPerKwh === null)
      return;
    dispatch({ type: "SET_ENERGY_TARIFFS", ...tariffs });
    await run({ gasTariffEurPerKwh, electricityTariffEurPerKwh });
  };

  return (
    <SharedEnergyTariffPanel
      gasTariff={gasTariff}
      electricityTariff={electricityTariff}
      onApplyTariffs={handleApply}
      isApplying={isRunning}
      canApply={
        state.goal !== null &&
        state.portfolio.selections.length > 0 &&
        state.packageIds.length > 0
      }
      applyLabel="Apply and recalculate"
    />
  );
}
