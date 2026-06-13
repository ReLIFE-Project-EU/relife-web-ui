import { EnergyTariffPanel as SharedEnergyTariffPanel } from "../../../../components/shared/EnergyTariffPanel";
import { useRSEWorkflow } from "../../hooks/useRSEWorkflow";
import { useStrategyExplorer } from "../../hooks/useStrategyExplorer";

export function EnergyTariffPanel() {
  const { state, dispatch } = useStrategyExplorer();
  const { run, isRunning } = useRSEWorkflow();
  const appliedGasTariff =
    state.workflowResult?.request.financialAssumptions.gasTariffEurPerKwh ??
    state.gasTariffEurPerKwh;

  const handleApply = async (gasTariffEurPerKwh: number) => {
    dispatch({ type: "SET_GAS_TARIFF", gasTariffEurPerKwh });
    await run({ gasTariffEurPerKwh });
  };

  return (
    <SharedEnergyTariffPanel
      appliedGasTariff={appliedGasTariff}
      onApplyGasTariff={handleApply}
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
