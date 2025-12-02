import { IconUsers } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { technical } from "../../../api";
import type { UCRequest, UCResponse } from "../../../types/technical";
import { useCalculator } from "../hooks/useCalculator";
import { ICON_SIZES } from "../utils";
import { CalculatorLayout } from "./CalculatorLayout";
import { MetricInputGroup } from "./MetricInputGroup";
import { ResultDisplay } from "./ResultDisplay";

interface UCCalculatorProps {
  profile: string;
}

export const UCCalculator = ({ profile }: UCCalculatorProps) => {
  const { loading, error, result, handleCalculate, clearResult } =
    useCalculator<UCRequest, UCResponse>(technical.calculateUC);

  useEffect(() => {
    clearResult();
  }, [profile, clearResult]);

  const [tempKpi, setTempKpi] = useState<string | number>(21);
  const [tempMin, setTempMin] = useState<string | number>(18);
  const [tempMax, setTempMax] = useState<string | number>(26);

  const [humidityKpi, setHumidityKpi] = useState<string | number>(50);
  const [humidityMin, setHumidityMin] = useState<string | number>(30);
  const [humidityMax, setHumidityMax] = useState<string | number>(70);

  const onCalculate = () => {
    const request: UCRequest = {
      thermal_comfort_air_temp_kpi: Number(tempKpi),
      thermal_comfort_air_temp_min: Number(tempMin),
      thermal_comfort_air_temp_max: Number(tempMax),
      thermal_comfort_humidity_kpi: Number(humidityKpi),
      thermal_comfort_humidity_min: Number(humidityMin),
      thermal_comfort_humidity_max: Number(humidityMax),
      profile: profile,
    };
    handleCalculate(request);
  };

  return (
    <CalculatorLayout
      title="User Comfort (UC)"
      icon={<IconUsers size={ICON_SIZES.header} />}
      description="Calculate the User Comfort score based on thermal comfort parameters (temperature and humidity)."
      loading={loading}
      error={error}
      onCalculate={onCalculate}
      calculateButtonLabel="Calculate UC"
    >
      <MetricInputGroup
        label="Thermal Comfort (Air Temperature)"
        kpiLabel="Current Temperature (°C)"
        kpiDescription="Indoor air temperature"
        kpiValue={tempKpi}
        onKpiChange={setTempKpi}
        minLabel="Min Temperature (°C)"
        minDescription="Minimum comfortable temperature"
        minValue={tempMin}
        onMinChange={setTempMin}
        maxLabel="Max Temperature (°C)"
        maxDescription="Maximum comfortable temperature"
        maxValue={tempMax}
        onMaxChange={setTempMax}
      />

      <MetricInputGroup
        label="Thermal Comfort (Humidity)"
        kpiLabel="Current Humidity (%)"
        kpiDescription="Indoor relative humidity"
        kpiValue={humidityKpi}
        onKpiChange={setHumidityKpi}
        minLabel="Min Humidity (%)"
        minDescription="Minimum comfortable humidity"
        minValue={humidityMin}
        onMinChange={setHumidityMin}
        maxLabel="Max Humidity (%)"
        maxDescription="Maximum comfortable humidity"
        maxValue={humidityMax}
        onMaxChange={setHumidityMax}
        min={0}
        max={100}
      />

      {result && (
        <ResultDisplay
          icon={<IconUsers size={ICON_SIZES.inline} />}
          kpiWeight={result.uc_kpi_weight}
          profileName={profile}
          metrics={[
            {
              label: "Temperature Comfort",
              value: result.thermal_comfort_air_temp_normalized,
            },
            {
              label: "Humidity Comfort",
              value: result.thermal_comfort_humidity_normalized,
            },
          ]}
          explanation={
            "User Comfort (UC) measures how well the indoor environment meets occupant comfort requirements. " +
            "The normalized scores show how close your current conditions are to the optimal comfort range. " +
            "Higher scores indicate better thermal comfort conditions. " +
            "Temperature and humidity levels within the defined comfort range will score closer to 100%."
          }
          inputData={result.input}
        />
      )}
    </CalculatorLayout>
  );
};
