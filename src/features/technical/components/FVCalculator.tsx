import { IconCoins } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { technical } from "../../../api";
import type { FVRequest, FVResponse } from "../../../types/technical";
import { useCalculator } from "../hooks/useCalculator";
import { ICON_SIZES } from "../utils";
import { CalculatorLayout } from "./CalculatorLayout";
import { MetricInputGroup } from "./MetricInputGroup";
import { ResultDisplay } from "./ResultDisplay";

interface FVCalculatorProps {
  profile: string;
}

export const FVCalculator = ({ profile }: FVCalculatorProps) => {
  const { loading, error, result, handleCalculate, clearResult } =
    useCalculator<FVRequest, FVResponse>(
      technical.calculateFV,
      "FVCalculator.calculate",
    );

  useEffect(() => {
    clearResult();
  }, [profile, clearResult]);

  const [iiKpi, setIiKpi] = useState<string | number>(500000);
  const [iiMin, setIiMin] = useState<string | number>(300000);
  const [iiMax, setIiMax] = useState<string | number>(1000000);

  const [aocKpi, setAocKpi] = useState<string | number>(50000);
  const [aocMin, setAocMin] = useState<string | number>(30000);
  const [aocMax, setAocMax] = useState<string | number>(100000);

  const [irrKpi, setIrrKpi] = useState<string | number>(8);
  const [irrMin, setIrrMin] = useState<string | number>(5);
  const [irrMax, setIrrMax] = useState<string | number>(15);

  const [npvKpi, setNpvKpi] = useState<string | number>(100000);
  const [npvMin, setNpvMin] = useState<string | number>(-50000);
  const [npvMax, setNpvMax] = useState<string | number>(500000);

  const onCalculate = () => {
    const request: FVRequest = {
      ii_kpi: Number(iiKpi),
      ii_min: Number(iiMin),
      ii_max: Number(iiMax),
      aoc_kpi: Number(aocKpi),
      aoc_min: Number(aocMin),
      aoc_max: Number(aocMax),
      irr_kpi: Number(irrKpi),
      irr_min: Number(irrMin),
      irr_max: Number(irrMax),
      npv_kpi: Number(npvKpi),
      npv_min: Number(npvMin),
      npv_max: Number(npvMax),
      profile: profile,
    };
    handleCalculate(request);
  };

  return (
    <CalculatorLayout
      title="Financial Viability (FV)"
      icon={<IconCoins size={ICON_SIZES.header} />}
      description="Calculate the Financial Viability score based on investment metrics, operating costs, and expected returns."
      loading={loading}
      error={error}
      onCalculate={onCalculate}
      calculateButtonLabel="Calculate FV"
    >
      <MetricInputGroup
        label="Initial Investment (II)"
        kpiLabel="Current Investment"
        kpiDescription="Project initial investment amount"
        kpiValue={iiKpi}
        onKpiChange={setIiKpi}
        minLabel="Min Investment"
        minDescription="Minimum expected investment"
        minValue={iiMin}
        onMinChange={setIiMin}
        maxLabel="Max Investment"
        maxDescription="Maximum budget threshold"
        maxValue={iiMax}
        onMaxChange={setIiMax}
        prefix="€"
        thousandSeparator=","
      />

      <MetricInputGroup
        label="Annual Operating Cost (AOC)"
        kpiLabel="Current AOC"
        kpiDescription="Yearly operating and maintenance costs"
        kpiValue={aocKpi}
        onKpiChange={setAocKpi}
        minLabel="Min AOC"
        minDescription="Best-case operating costs"
        minValue={aocMin}
        onMinChange={setAocMin}
        maxLabel="Max AOC"
        maxDescription="Worst-case operating costs"
        maxValue={aocMax}
        onMaxChange={setAocMax}
        prefix="€"
        thousandSeparator=","
      />

      <MetricInputGroup
        label="Internal Rate of Return (IRR)"
        kpiLabel="Current IRR (%)"
        kpiDescription="Expected annual return rate"
        kpiValue={irrKpi}
        onKpiChange={setIrrKpi}
        minLabel="Min IRR (%)"
        minDescription="Minimum acceptable return"
        minValue={irrMin}
        onMinChange={setIrrMin}
        maxLabel="Max IRR (%)"
        maxDescription="Target return rate"
        maxValue={irrMax}
        onMaxChange={setIrrMax}
        suffix="%"
      />

      <MetricInputGroup
        label="Net Present Value (NPV)"
        kpiLabel="Current NPV"
        kpiDescription="Present value of future cash flows"
        kpiValue={npvKpi}
        onKpiChange={setNpvKpi}
        minLabel="Min NPV"
        minDescription="Minimum acceptable NPV (break-even)"
        minValue={npvMin}
        onMinChange={setNpvMin}
        maxLabel="Max NPV"
        maxDescription="Target NPV for strong viability"
        maxValue={npvMax}
        onMaxChange={setNpvMax}
        prefix="€"
        thousandSeparator=","
      />

      {result && (
        <ResultDisplay
          icon={<IconCoins size={ICON_SIZES.inline} />}
          kpiWeight={result.fv_kpi_weight}
          profileName={profile}
          metrics={[
            {
              label: "Initial Investment",
              value: result.ii_normalized,
              isLowerBetter: true,
            },
            {
              label: "Annual Operating Cost",
              value: result.aoc_normalized,
              isLowerBetter: true,
            },
            {
              label: "Internal Rate of Return",
              value: result.irr_normalized,
            },
            {
              label: "Net Present Value",
              value: result.npv_normalized,
            },
          ]}
          explanation={
            "Financial Viability (FV) evaluates the economic feasibility and profitability of your project. " +
            "Initial Investment and Annual Operating Costs are normalized where lower values indicate better cost efficiency. " +
            "Internal Rate of Return (IRR) measures the percentage yield on investment - higher values show stronger returns. " +
            "Net Present Value (NPV) represents the total value created by the project - positive NPV indicates profitability. " +
            "Higher normalized scores suggest your project has strong financial prospects and aligns with best-practice investment criteria."
          }
          inputData={result.input}
        />
      )}
    </CalculatorLayout>
  );
};
