/**
 * EnergyDeepDive — left column of the HRA deep-dive panel.
 * Shows thermal needs, system energy use, CO₂, health impact, and
 * the scenario's measure list, all relative to the current home today.
 */

import { Group, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { ConceptMetricCard, DeltaBadge } from "../../../../components/shared";
import type { RenovationScenario } from "../../context/types";
import { getScenarioColor } from "../../utils/colorUtils";
import {
  calculatePercentChange,
  formatCount,
  formatDecimal,
  formatHealthyLifeDays,
  formatNumber,
  formatPercent,
  toHealthyLifeDays,
} from "../../utils/formatters";
import classes from "./ResultsLayout.module.css";
import shared from "../../../../components/shared/ResultsLayout.module.css";

const PERCENT_PER_RATIO = 100;

interface EnergyDeepDiveProps {
  current: RenovationScenario;
  selected: RenovationScenario;
}

export function EnergyDeepDive({ current, selected }: EnergyDeepDiveProps) {
  const color = getScenarioColor(selected.id);

  return (
    <div>
      <h3 className={shared.deepHeading}>Energy &amp; health</h3>

      <div className={shared.tileGrid}>
        <ConceptMetricCard
          conceptId="annual-building-thermal-needs"
          value={formatNumber(selected.annualEnergyNeeds)}
          withUnit
          footer={
            <VersusToday
              today={formatNumber(current.annualEnergyNeeds)}
              changePct={calculatePercentChange(
                current.annualEnergyNeeds,
                selected.annualEnergyNeeds,
              )}
            />
          }
        />

        {selected.deliveredTotal !== undefined &&
        current.deliveredTotal !== undefined ? (
          <ConceptMetricCard
            conceptId="system-energy-consumption"
            value={formatNumber(selected.deliveredTotal)}
            withUnit
            footer={
              <VersusToday
                today={formatNumber(current.deliveredTotal)}
                changePct={calculatePercentChange(
                  current.deliveredTotal,
                  selected.deliveredTotal,
                )}
              />
            }
          />
        ) : null}

        {selected.annualEmissionsTonCo2e !== undefined &&
        current.annualEmissionsTonCo2e !== undefined ? (
          <ConceptMetricCard
            conceptId="operational-co2-emissions"
            value={formatDecimal(selected.annualEmissionsTonCo2e)}
            withUnit
            footer={
              <VersusToday
                today={formatDecimal(current.annualEmissionsTonCo2e)}
                changePct={calculatePercentChange(
                  current.annualEmissionsTonCo2e,
                  selected.annualEmissionsTonCo2e,
                )}
              />
            }
          />
        ) : null}

        <ConceptMetricCard
          conceptId="thermal-health-impact"
          value={formatHealthyLifeDays(
            toHealthyLifeDays(selected.annualThermalDalyPerPerson),
          )}
          footer={
            <FooterLine>
              vs.{" "}
              {formatHealthyLifeDays(
                toHealthyLifeDays(current.annualThermalDalyPerPerson),
              )}{" "}
              today
            </FooterLine>
          }
        />
      </div>

      {selected.pvGeneration !== undefined ? (
        <div className={classes.block}>
          <div className={shared.deepEyebrow}>Solar PV</div>
          <div className={shared.tileGrid}>
            <ConceptMetricCard
              conceptId="pv-generation"
              value={formatNumber(selected.pvGeneration)}
              withUnit
            />
            {selected.pvSelfConsumption !== undefined ? (
              <ConceptMetricCard
                conceptId="pv-self-consumption"
                value={formatNumber(selected.pvSelfConsumption)}
                withUnit
                footer={
                  selected.pvSelfConsumptionRate !== undefined ? (
                    <FooterLine>
                      {formatPercent(
                        selected.pvSelfConsumptionRate * PERCENT_PER_RATIO,
                      )}{" "}
                      of generation
                    </FooterLine>
                  ) : undefined
                }
              />
            ) : null}
            {selected.pvGridExport !== undefined ? (
              <ConceptMetricCard
                conceptId="pv-grid-export"
                value={formatNumber(selected.pvGridExport)}
                withUnit
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={classes.block}>
        <div className={shared.deepEyebrow}>Measures included</div>
        <div
          className={shared.measures}
          style={
            {
              "--accent-color": `var(--mantine-color-${color}-6)`,
            } as React.CSSProperties
          }
        >
          <div className={shared.measuresHead}>
            <Text size="sm" fw={600}>
              {formatCount(selected.measures.length, "measure")}
            </Text>
          </div>
          {selected.measures.length > 0 ? (
            <ul className={shared.measuresList}>
              {selected.measures.map((measure, idx) => (
                <li key={idx}>{measure}</li>
              ))}
            </ul>
          ) : (
            <Text size="sm" c="dimmed" fs="italic">
              No measures selected for this package.
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}

function FooterLine({ children }: { children: ReactNode }) {
  return (
    <Group gap={6} c="dimmed" fz="xs">
      {children}
    </Group>
  );
}

/** The tile states the unit once, so today's figure is a bare number. */
function VersusToday({
  today,
  changePct,
}: {
  today: string;
  changePct: number;
}) {
  return (
    <FooterLine>
      <DeltaBadge delta={changePct} higherIsBetter={false} />
      vs. {today} today
    </FooterLine>
  );
}
