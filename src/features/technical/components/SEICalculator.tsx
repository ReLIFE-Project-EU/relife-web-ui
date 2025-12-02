import { IconPlant2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { technical } from "../../../api";
import type { SEIRequest, SEIResponse } from "../../../types/technical";
import { useCalculator } from "../hooks/useCalculator";
import { ICON_SIZES } from "../utils";
import { CalculatorLayout } from "./CalculatorLayout";
import { MetricInputGroup } from "./MetricInputGroup";
import { ResultDisplay } from "./ResultDisplay";

interface SEICalculatorProps {
  profile: string;
}

export const SEICalculator = ({ profile }: SEICalculatorProps) => {
  const { loading, error, result, handleCalculate, clearResult } =
    useCalculator<SEIRequest, SEIResponse>(technical.calculateSEI);

  useEffect(() => {
    clearResult();
  }, [profile, clearResult]);

  const [embodiedCarbonKpi, setEmbodiedCarbonKpi] = useState<string | number>(
    500,
  );
  const [embodiedCarbonMin, setEmbodiedCarbonMin] = useState<string | number>(
    100,
  );
  const [embodiedCarbonMax, setEmbodiedCarbonMax] = useState<string | number>(
    1000,
  );

  const [gwpKpi, setGwpKpi] = useState<string | number>(50);
  const [gwpMin, setGwpMin] = useState<string | number>(10);
  const [gwpMax, setGwpMax] = useState<string | number>(100);

  const onCalculate = () => {
    const request: SEIRequest = {
      embodied_carbon_kpi: Number(embodiedCarbonKpi),
      embodied_carbon_min: Number(embodiedCarbonMin),
      embodied_carbon_max: Number(embodiedCarbonMax),
      gwp_kpi: Number(gwpKpi),
      gwp_min: Number(gwpMin),
      gwp_max: Number(gwpMax),
      profile: profile,
    };
    handleCalculate(request);
  };

  return (
    <CalculatorLayout
      title="Sustainability Environmental Index (SEI)"
      icon={<IconPlant2 size={ICON_SIZES.header} />}
      description="Calculate the Sustainability Environmental Index based on embodied carbon and global warming potential."
      loading={loading}
      error={error}
      onCalculate={onCalculate}
      calculateButtonLabel="Calculate SEI"
    >
      <MetricInputGroup
        label="Embodied Carbon"
        kpiLabel="Current Value (kgCO2e/m²)"
        kpiDescription="Total embodied carbon per square meter"
        kpiValue={embodiedCarbonKpi}
        onKpiChange={setEmbodiedCarbonKpi}
        minLabel="Min Value (kgCO2e/m²)"
        minDescription="Lowest achievable embodied carbon"
        minValue={embodiedCarbonMin}
        onMinChange={setEmbodiedCarbonMin}
        maxLabel="Max Value (kgCO2e/m²)"
        maxDescription="Maximum acceptable embodied carbon"
        maxValue={embodiedCarbonMax}
        onMaxChange={setEmbodiedCarbonMax}
        min={0}
      />

      <MetricInputGroup
        label="Global Warming Potential (GWP)"
        kpiLabel="Current GWP (kgCO2e)"
        kpiDescription="Current global warming potential"
        kpiValue={gwpKpi}
        onKpiChange={setGwpKpi}
        minLabel="Min GWP (kgCO2e)"
        minDescription="Lowest achievable GWP"
        minValue={gwpMin}
        onMinChange={setGwpMin}
        maxLabel="Max GWP (kgCO2e)"
        maxDescription="Maximum acceptable GWP"
        maxValue={gwpMax}
        onMaxChange={setGwpMax}
        min={0}
      />

      {result && (
        <ResultDisplay
          icon={<IconPlant2 size={ICON_SIZES.inline} />}
          kpiWeight={result.sei_kpi_weight}
          profileName={profile}
          metrics={[
            {
              label: "Embodied Carbon",
              value: result.embodied_carbon_normalized,
              isLowerBetter: true,
            },
            {
              label: "Global Warming Potential (GWP)",
              value: result.gwp_normalized,
              isLowerBetter: true,
            },
          ]}
          explanation={
            "Sustainability Environmental Index (SEI) evaluates the environmental impact of your project. " +
            "Embodied Carbon measures the total CO2 emissions from materials and construction (lower is better). " +
            "Global Warming Potential (GWP) quantifies the greenhouse gas emissions over the project lifecycle. " +
            "Higher scores indicate better environmental performance, meaning your actual values are closer to the minimum (best practice) thresholds."
          }
          inputData={result.input}
        />
      )}
    </CalculatorLayout>
  );
};
