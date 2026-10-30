import { EnergyTariffPanel as SharedEnergyTariffPanel } from "../../../../components/shared/EnergyTariffPanel";
import { useRSEWorkflow } from "../../hooks/useRSEWorkflow";
import { useStrategyExplorer } from "../../hooks/useStrategyExplorer";

export function EnergyTariffPanel() {
  const { state, dispatch, gasTariff } = useStrategyExplorer();
  const { run, isRunning } = useRSEWorkflow();

  const handleApply = async (gasTariffEurPerKwh: number) => {
    dispatch({ type: "SET_GAS_TARIFF", gasTariffEurPerKwh });
    await run({ gasTariffEurPerKwh });
  };

  const handleReset = async () => {
    dispatch({ type: "RESET_GAS_TARIFF" });
    await run({ gasTariffEurPerKwh: gasTariff.reference.eurPerKwh });
  };

  return (
    <SharedEnergyTariffPanel
      gasTariff={gasTariff}
      onApplyGasTariff={handleApply}
      onResetGasTariff={handleReset}
      isApplying={isRunning}
      canApply={
        state.goal !== null &&
        state.portfolio.selections.length > 0 &&
        state.packageIds.length > 0
      }
      applyLabel="Apply and recalculate"
      applyingLabel="Recalculating financial indicators across your portfolio..."
    />
  );
}
