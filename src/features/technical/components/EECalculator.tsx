import { IconBolt } from "@tabler/icons-react";
import { useState } from "react";
import { technical } from "../../../api";
import type { EERequest, EEResponse } from "../../../types/technical";
import { useCalculator } from "../hooks/useCalculator";
import { ICON_SIZES } from "../utils";
import { CalculatorLayout } from "./CalculatorLayout";
import { MetricInputGroup } from "./MetricInputGroup";
import { ResultDisplay } from "./ResultDisplay";

export const EECalculator = () => {
  const { loading, error, result, profile, setProfile, handleCalculate } =
    useCalculator<EERequest, EEResponse>(technical.calculateEE);

  const [envelopeKpi, setEnvelopeKpi] = useState<string | number>(0.5);
  const [envelopeMin, setEnvelopeMin] = useState<string | number>(0.1);
  const [envelopeMax, setEnvelopeMax] = useState<string | number>(1.0);

  const [windowKpi, setWindowKpi] = useState<string | number>(1.2);
  const [windowMin, setWindowMin] = useState<string | number>(0.8);
  const [windowMax, setWindowMax] = useState<string | number>(2.5);

  const [heatingKpi, setHeatingKpi] = useState<string | number>(0.9);
  const [heatingMin, setHeatingMin] = useState<string | number>(0.6);
  const [heatingMax, setHeatingMax] = useState<string | number>(1.2);

  const [coolingKpi, setCoolingKpi] = useState<string | number>(2.5);
  const [coolingMin, setCoolingMin] = useState<string | number>(2.0);
  const [coolingMax, setCoolingMax] = useState<string | number>(4.0);

  const onCalculate = () => {
    const request: EERequest = {
      envelope_kpi: Number(envelopeKpi),
      envelope_min: Number(envelopeMin),
      envelope_max: Number(envelopeMax),
      window_kpi: Number(windowKpi),
      window_min: Number(windowMin),
      window_max: Number(windowMax),
      heating_system_kpi: Number(heatingKpi),
      heating_system_min: Number(heatingMin),
      heating_system_max: Number(heatingMax),
      cooling_system_kpi: Number(coolingKpi),
      cooling_system_min: Number(coolingMin),
      cooling_system_max: Number(coolingMax),
      profile: profile,
    };
    handleCalculate(request);
  };

  return (
    <CalculatorLayout
      title="Energy Efficiency (EE)"
      icon={<IconBolt size={ICON_SIZES.header} />}
      description="Calculate the Energy Efficiency score based on building envelope and system performance indicators."
      loading={loading}
      error={error}
      profile={profile}
      onProfileChange={setProfile}
      onCalculate={onCalculate}
      calculateButtonLabel="Calculate EE"
    >
      <MetricInputGroup
        label="Building Envelope"
        kpiLabel="Envelope U-Value"
        kpiDescription="Current thermal transmittance (W/m²K)"
        kpiValue={envelopeKpi}
        onKpiChange={setEnvelopeKpi}
        minLabel="Min U-Value"
        minDescription="Best achievable performance"
        minValue={envelopeMin}
        onMinChange={setEnvelopeMin}
        maxLabel="Max U-Value"
        maxDescription="Baseline or worst acceptable performance"
        maxValue={envelopeMax}
        onMaxChange={setEnvelopeMax}
      />

      <MetricInputGroup
        label="Windows"
        kpiLabel="Window U-Value"
        kpiDescription="Current window thermal transmittance (W/m²K)"
        kpiValue={windowKpi}
        onKpiChange={setWindowKpi}
        minLabel="Min U-Value"
        minDescription="Best achievable performance"
        minValue={windowMin}
        onMinChange={setWindowMin}
        maxLabel="Max U-Value"
        maxDescription="Baseline or worst acceptable performance"
        maxValue={windowMax}
        onMaxChange={setWindowMax}
      />

      <MetricInputGroup
        label="Heating System"
        kpiLabel="Heating Efficiency"
        kpiDescription="Current system efficiency (COP or %)"
        kpiValue={heatingKpi}
        onKpiChange={setHeatingKpi}
        minLabel="Min Efficiency"
        minDescription="Lowest acceptable efficiency"
        minValue={heatingMin}
        onMinChange={setHeatingMin}
        maxLabel="Max Efficiency"
        maxDescription="Best achievable efficiency"
        maxValue={heatingMax}
        onMaxChange={setHeatingMax}
      />

      <MetricInputGroup
        label="Cooling System"
        kpiLabel="Cooling Efficiency"
        kpiDescription="Current system efficiency (EER or SEER)"
        kpiValue={coolingKpi}
        onKpiChange={setCoolingKpi}
        minLabel="Min Efficiency"
        minDescription="Lowest acceptable efficiency"
        minValue={coolingMin}
        onMinChange={setCoolingMin}
        maxLabel="Max Efficiency"
        maxDescription="Best achievable efficiency"
        maxValue={coolingMax}
        onMaxChange={setCoolingMax}
      />

      {result && (
        <ResultDisplay
          icon={<IconBolt size={ICON_SIZES.inline} />}
          kpiWeight={result.ee_kpi_weight}
          profileName={profile}
          metrics={[
            {
              label: "Building Envelope",
              value: result.envelope_normalized,
              isLowerBetter: true,
            },
            {
              label: "Windows",
              value: result.window_normalized,
              isLowerBetter: true,
            },
            {
              label: "Heating System",
              value: result.heating_system_normalized,
              isLowerBetter: true,
            },
            {
              label: "Cooling System",
              value: result.cooling_system_normalized,
              isLowerBetter: true,
            },
          ]}
          explanation={
            "Energy Efficiency (EE) evaluates how effectively your building systems minimize energy consumption. " +
            "Building Envelope and Windows are measured by U-values (thermal transmittance) - lower values mean better insulation. " +
            "Heating and Cooling System scores reflect efficiency ratings like COP, EER, or SEER - higher values indicate more efficient systems. " +
            "Higher normalized scores indicate your systems are performing closer to best practice benchmarks, reducing energy waste and operational costs."
          }
          inputData={result.input}
        />
      )}
    </CalculatorLayout>
  );
};
