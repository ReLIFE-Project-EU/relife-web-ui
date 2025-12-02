import { IconLeaf } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { technical } from "../../../api";
import type { REIRequest, REIResponse } from "../../../types/technical";
import { useCalculator } from "../hooks/useCalculator";
import { ICON_SIZES } from "../utils";
import { CalculatorLayout } from "./CalculatorLayout";
import { MetricInputGroup } from "./MetricInputGroup";
import { ResultDisplay } from "./ResultDisplay";

interface REICalculatorProps {
  profile: string;
}

export const REICalculator = ({ profile }: REICalculatorProps) => {
  const { loading, error, result, handleCalculate, clearResult } =
    useCalculator<REIRequest, REIResponse>(technical.calculateREI);

  useEffect(() => {
    clearResult();
  }, [profile, clearResult]);

  const [stCoverageKpi, setStCoverageKpi] = useState<string | number>(30);
  const [stCoverageMin, setStCoverageMin] = useState<string | number>(0);
  const [stCoverageMax, setStCoverageMax] = useState<string | number>(100);

  const [onsiteResKpi, setOnsiteResKpi] = useState<string | number>(40);
  const [onsiteResMin, setOnsiteResMin] = useState<string | number>(0);
  const [onsiteResMax, setOnsiteResMax] = useState<string | number>(100);

  const [netExportKpi, setNetExportKpi] = useState<string | number>(10);
  const [netExportMin, setNetExportMin] = useState<string | number>(-50);
  const [netExportMax, setNetExportMax] = useState<string | number>(50);

  const onCalculate = () => {
    const request: REIRequest = {
      st_coverage_kpi: Number(stCoverageKpi),
      st_coverage_min: Number(stCoverageMin),
      st_coverage_max: Number(stCoverageMax),
      onsite_res_kpi: Number(onsiteResKpi),
      onsite_res_min: Number(onsiteResMin),
      onsite_res_max: Number(onsiteResMax),
      net_energy_export_kpi: Number(netExportKpi),
      net_energy_export_min: Number(netExportMin),
      net_energy_export_max: Number(netExportMax),
      profile: profile,
    };
    handleCalculate(request);
  };

  return (
    <CalculatorLayout
      title="Renewable Energy Index (REI)"
      icon={<IconLeaf size={ICON_SIZES.header} />}
      description="Calculate the Renewable Energy Index based on solar coverage, onsite renewable generation, and energy export."
      loading={loading}
      error={error}
      onCalculate={onCalculate}
      calculateButtonLabel="Calculate REI"
    >
      <MetricInputGroup
        label="Solar Thermal Coverage"
        kpiLabel="Current Coverage (%)"
        kpiDescription="Percentage of demand met by solar thermal"
        kpiValue={stCoverageKpi}
        onKpiChange={setStCoverageKpi}
        minLabel="Min Coverage (%)"
        minDescription="Minimum acceptable coverage"
        minValue={stCoverageMin}
        onMinChange={setStCoverageMin}
        maxLabel="Max Coverage (%)"
        maxDescription="Target or maximum possible coverage"
        maxValue={stCoverageMax}
        onMaxChange={setStCoverageMax}
        min={0}
        max={100}
      />

      <MetricInputGroup
        label="Onsite RES Generation"
        kpiLabel="Current Generation (%)"
        kpiDescription="Percentage of energy generated onsite"
        kpiValue={onsiteResKpi}
        onKpiChange={setOnsiteResKpi}
        minLabel="Min Generation (%)"
        minDescription="Minimum acceptable generation"
        minValue={onsiteResMin}
        onMinChange={setOnsiteResMin}
        maxLabel="Max Generation (%)"
        maxDescription="Target or maximum possible generation"
        maxValue={onsiteResMax}
        onMaxChange={setOnsiteResMax}
        min={0}
        max={100}
      />

      <MetricInputGroup
        label="Net Energy Export"
        kpiLabel="Current Export (kWh/m²)"
        kpiDescription="Net energy exported to grid (positive) or imported (negative)"
        kpiValue={netExportKpi}
        onKpiChange={setNetExportKpi}
        minLabel="Min Export (kWh/m²)"
        minDescription="Lowest acceptable export level"
        minValue={netExportMin}
        onMinChange={setNetExportMin}
        maxLabel="Max Export (kWh/m²)"
        maxDescription="Target export level"
        maxValue={netExportMax}
        onMaxChange={setNetExportMax}
      />

      {result && (
        <ResultDisplay
          icon={<IconLeaf size={ICON_SIZES.inline} />}
          kpiWeight={result.rei_kpi_weight}
          profileName={profile}
          metrics={[
            {
              label: "Solar Thermal Coverage",
              value: result.st_coverage_normalized,
            },
            {
              label: "Onsite RES Generation",
              value: result.onsite_res_normalized,
            },
            {
              label: "Net Energy Export",
              value: result.net_energy_normalized,
            },
          ]}
          explanation={
            "Renewable Energy Index (REI) measures your project's renewable energy performance. " +
            "Solar Thermal Coverage shows how much of your thermal energy needs are met by solar systems. " +
            "Onsite RES Generation tracks the percentage of energy produced from renewable sources on-site. " +
            "Net Energy Export indicates whether your building is a net energy producer (positive) or consumer (negative). " +
            "Higher scores indicate better renewable energy integration and reduced dependence on grid electricity."
          }
          inputData={result.input}
        />
      )}
    </CalculatorLayout>
  );
};
