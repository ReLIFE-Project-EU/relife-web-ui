/**
 * EnergyDeepDive — left column of the HRA deep-dive panel.
 * Shows EPC swap, thermal needs, system energy use, and the
 * scenario's measure list, all relative to the current home today.
 */

import { Text } from "@mantine/core";
import {
  IconBolt,
  IconCertificate,
  IconCloud,
  IconPlug,
  IconSolarPanel,
  IconSun,
  IconUpload,
} from "@tabler/icons-react";
import { ConceptExplainer } from "../../../../components/shared/ConceptExplainer";
import {
  relifeConcepts,
  type ConceptId,
} from "../../../../constants/relifeConcepts";
import { DeltaBadge, EPCBadge } from "../../../../components/shared";
import type { RenovationScenario } from "../../context/types";
import { getScenarioColor } from "../../utils/colorUtils";
import {
  calculatePercentChange,
  formatDecimal,
  formatEnergyPerYear,
  formatNumber,
  formatTonnageCo2,
} from "../../utils/formatters";
import { getEnergyIntensity } from "../../../../utils/epcUtils";
import classes from "./ResultsLayout.module.css";
import shared from "../../../../components/shared/ResultsLayout.module.css";

interface EnergyDeepDiveProps {
  current: RenovationScenario;
  selected: RenovationScenario;
  floorArea?: number;
}

export function EnergyDeepDive({
  current,
  selected,
  floorArea,
}: EnergyDeepDiveProps) {
  const color = getScenarioColor(selected.id);
  const intensityCurrent = getEnergyIntensity(current, floorArea);
  const intensitySelected = getEnergyIntensity(selected, floorArea);

  return (
    <div>
      <div className={shared.deepEyebrow}>Energy &amp; comfort</div>
      <h3 className={shared.deepHeading}>vs. your home today</h3>

      <div className={shared.miniGrid}>
        <div className={shared.miniCard}>
          <div className={shared.miniLabel}>
            <IconCertificate size={14} />
            EPC class
            <ConceptExplainer conceptId="estimated-epc" />
          </div>
          <div className={classes.epcInline}>
            <EPCBadge
              epcClass={current.epcClass}
              size="md"
              estimated
              energyIntensity={intensityCurrent}
            />
            <span className={classes.epcInlineArrow} aria-hidden>
              →
            </span>
            <EPCBadge
              epcClass={selected.epcClass}
              size="md"
              estimated
              energyIntensity={intensitySelected}
            />
          </div>
          {intensityCurrent !== undefined && intensitySelected !== undefined ? (
            <Text size="xs" c="dimmed" mt={6}>
              ~{formatNumber(intensityCurrent)} → ~
              {formatNumber(intensitySelected)} kWh/m²/year
            </Text>
          ) : null}
        </div>

        <MiniMetric
          icon={<IconBolt size={14} />}
          conceptId="annual-building-thermal-needs"
          value={formatNumber(selected.annualEnergyNeeds)}
          delta={
            <>
              <DeltaBadge
                delta={calculatePercentChange(
                  current.annualEnergyNeeds,
                  selected.annualEnergyNeeds,
                )}
                higherIsBetter={false}
              />
              <Text size="xs" c="dimmed" component="span">
                vs. {formatEnergyPerYear(current.annualEnergyNeeds)} today
              </Text>
            </>
          }
        />

        {selected.deliveredTotal !== undefined &&
        current.deliveredTotal !== undefined ? (
          <MiniMetric
            icon={<IconPlug size={14} />}
            conceptId="system-energy-consumption"
            value={formatNumber(selected.deliveredTotal)}
            delta={
              <>
                <DeltaBadge
                  delta={calculatePercentChange(
                    current.deliveredTotal,
                    selected.deliveredTotal,
                  )}
                  higherIsBetter={false}
                />
                <Text size="xs" c="dimmed" component="span">
                  delivered to building
                </Text>
              </>
            }
          />
        ) : null}

        {selected.annualEmissionsTonCo2e !== undefined &&
        current.annualEmissionsTonCo2e !== undefined ? (
          <MiniMetric
            icon={<IconCloud size={14} />}
            conceptId="operational-co2-emissions"
            value={formatDecimal(selected.annualEmissionsTonCo2e)}
            delta={
              <>
                <DeltaBadge
                  delta={calculatePercentChange(
                    current.annualEmissionsTonCo2e,
                    selected.annualEmissionsTonCo2e,
                  )}
                  higherIsBetter={false}
                />
                <Text size="xs" c="dimmed" component="span">
                  vs.{" "}
                  {formatTonnageCo2(current.annualEmissionsTonCo2e, {
                    decimal: true,
                  })}{" "}
                  today
                </Text>
              </>
            }
          />
        ) : null}
      </div>

      {selected.pvGeneration !== undefined ? (
        <div style={{ marginTop: 18 }}>
          <div className={shared.deepEyebrow} style={{ marginBottom: 6 }}>
            Solar PV
          </div>
          <div className={shared.miniGrid}>
            <MiniMetric
              icon={<IconSolarPanel size={14} />}
              conceptId="pv-generation"
              value={formatNumber(selected.pvGeneration)}
            />
            {selected.pvSelfConsumption !== undefined ? (
              <MiniMetric
                icon={<IconSun size={14} />}
                conceptId="pv-self-consumption"
                value={formatNumber(selected.pvSelfConsumption)}
                delta={
                  selected.pvSelfConsumptionRate !== undefined ? (
                    <Text size="xs" c="dimmed" component="span">
                      {formatNumber(selected.pvSelfConsumptionRate * 100)}% of
                      generation
                    </Text>
                  ) : null
                }
              />
            ) : null}
            {selected.pvGridExport !== undefined ? (
              <MiniMetric
                icon={<IconUpload size={14} />}
                conceptId="pv-grid-export"
                value={formatNumber(selected.pvGridExport)}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 18 }}>
        <div className={shared.deepEyebrow} style={{ marginBottom: 6 }}>
          Measures included
        </div>
        <div
          className={classes.measures}
          style={
            {
              "--scen-color": `var(--mantine-color-${color}-6)`,
            } as React.CSSProperties
          }
        >
          <div className={shared.measuresHead}>
            <Text size="sm" fw={600}>
              {selected.measures.length}{" "}
              {selected.measures.length === 1 ? "action" : "actions"}
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

interface MiniMetricProps {
  icon: React.ReactNode;
  /** Concept this card represents. Drives label, unit, and the info-icon explainer. */
  conceptId: ConceptId;
  /** Pre-formatted main value. */
  value: string;
  /** Override the unit suffix; defaults to the concept's `unit`. */
  unit?: string;
  /** Override the label; defaults to the concept's `label`. */
  label?: string;
  delta?: React.ReactNode;
}

function MiniMetric({
  icon,
  conceptId,
  value,
  unit,
  label,
  delta,
}: MiniMetricProps) {
  const concept = relifeConcepts[conceptId];
  const resolvedUnit = unit ?? concept.unit;
  const resolvedLabel = label ?? concept.label;
  return (
    <div className={shared.miniCard}>
      <div className={shared.miniLabel}>
        {icon}
        {resolvedLabel}
        <ConceptExplainer conceptId={conceptId} />
      </div>
      <div className={shared.miniValue}>
        {value}
        {resolvedUnit ? (
          <span className={shared.miniUnit}>{resolvedUnit}</span>
        ) : null}
      </div>
      {delta ? <div className={classes.miniDelta}>{delta}</div> : null}
    </div>
  );
}
