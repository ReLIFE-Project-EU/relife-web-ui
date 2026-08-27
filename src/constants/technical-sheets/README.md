# Technical Sheets Dataset

> [!INFO]
> This dataset includes more detail than we currently need. All sheet details were converted to structured data, though initially we'll only use the embodied carbon values.

Typed transcription of the eleven ReLIFE technical sheets. Values are verbatim from the source PDF documents.

## Files

| File                    | Sheets                                                                        |
| ----------------------- | ----------------------------------------------------------------------------- |
| `types.ts`              | schema                                                                        |
| `envelopeInsulation.ts` | EPS, XPS, Mineral Wool                                                        |
| `envelopeWindows.ts`    | Aluminium, PVC, Wood                                                          |
| `systems.ts`            | Air-to-Air HP, Air-to-Water HP, Condensing Boiler                             |
| `renewables.ts`         | Photovoltaic, Solar Thermal                                                   |
| `index.ts`              | `TECHNICAL_SHEETS`, `TECHNICAL_SHEET_BY_ID`, `TECHNICAL_SHEETS_BY_MEASURE_ID` |

```ts
import {
  TECHNICAL_SHEETS,
  TECHNICAL_SHEET_BY_ID,
  TECHNICAL_SHEETS_BY_MEASURE_ID,
} from "../constants/technical-sheets";
```

## Measure Links

Sheets use `TechnicalSheetId` and link to measures via `relatedMeasureIds` (many-to-many). `category` reuses `MeasureCategory` from `src/services/types.ts`.

Air-to-Air Heat Pump has no `relatedMeasureIds`—no equivalent measure in the catalog.

## Units & Normalization

- Thermal resistance: `thermalResistanceM2KW` (m²·K/W)
- Embodied carbon: `kgCO2e` with per-entry `functionalUnit`
- Efficiency: 0–1 fraction (PV percentages normalized)
- Cost: `{ min, max, currency: "EUR", unit }` (`per-m2` or `total`)
- European decimal commas → JS numbers; nested `application` bullets flattened to strings

Insulation/window embodied-carbon tables are headered `kgCO2e/unit` but prose says per m²—the dataset uses `per-m2`.

## Data Quality

Flags on `embodiedCarbon.dataQuality` or individual values: `european-average`, `linearly-extrapolated`, `single-source-datapoint`, `suspected-duplicate`.

**Notable source issues (preserved as-is):**

- XPS embodied carbon and R-values duplicate EPS (`suspected-duplicate`)—do not treat as distinct until source is corrected.
- Mineral wool and condensing boiler embodied carbon extrapolated from single datapoints.
- Empty sections flagged `missingInSource`: mineral wool maintenance, air-to-air HP cost, air-to-water HP application, condensing boiler application.
- No GWP module boundary, country breakdown, or EPD references. The sheets alone cannot populate `gwp_kpi` in `src/types/technical.ts`; the pipeline pairs their product-stage figures with Forecasting emission factors to send lifetime carbon instead (`computeLifetimeCarbonKgCo2e`).
