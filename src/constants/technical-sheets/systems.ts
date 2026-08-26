/**
 * Heating and cooling system technical sheets: air-to-air heat pump,
 * air-to-water heat pump, condensing boiler.
 *
 * These sheets key their tables on capacity and quote embodied carbon per
 * installed unit rather than per m².
 */

import type { TechnicalSheet } from "./types";

const EXTRACTED_ON = "2026-07-31";

const SCOP_DEFINITION =
  "Indicates the average heating efficiency over a full heating season. It is the ratio of total heating output to total electrical energy input. Higher SCOP means better efficiency in heating mode.";

const HEAT_PUMP_EMBODIED_CARBON_NOTE =
  "The embodied carbon of heat pump systems varies depending on size and material composition. Estimates below are for manufacturing and delivery for 1 unit.";

export const SYSTEM_SHEETS = [
  {
    id: "air-to-air-heat-pump",
    name: "Air to Air Heat Pump",
    category: "systems",
    // No matching RenovationMeasureId: the measure catalog covers air-water
    // heat pumps only. Retained because it is part of the source sheet set.
    relatedMeasureIds: [],
    description:
      "An air-to-air heat pump is a versatile HVAC system that extracts heat from the outdoor air and transfers it indoors for heating or reverses the cycle to remove indoor heat and provide cooling. Using a refrigeration cycle, it offers an energy-efficient alternative to traditional heating and cooling systems.",
    application: [
      "Outdoor Unit: Contains the compressor and heat exchanger.",
      "Indoor Unit(s): Distributes air and can be wall-mounted, ducted or floor-standing.",
      "Refrigerant Lines: Copper piping connecting outdoor and indoor units.",
      "Controls: Thermostats or controllers for operation.",
    ],
    advantages: [
      "Dual functionality: Provides both heating and cooling.",
      "High seasonal energy efficiency (SCOP and SEER values).",
      "Environmentally friendly: Reduces greenhouse gas emissions compared to fossil fuel-based systems.",
      "Quick installation and easy retrofit for existing buildings.",
      "Low operational costs due to high efficiency.",
    ],
    disadvantages: [
      "Reduced performance in very cold climates.",
      "Outdoor unit requires space and may generate some noise.",
      "Regular maintenance needed to maintain efficiency.",
    ],
    efficiencyMetrics: [
      {
        key: "scop",
        name: "SCOP (Seasonal Coefficient of Performance)",
        definition: SCOP_DEFINITION,
        typicalRange: { min: 2.8, max: 4.5 },
      },
      {
        key: "seer",
        name: "SEER (Seasonal Energy Efficiency Ratio)",
        definition:
          "Represents the average cooling efficiency over an entire cooling season. It is calculated as the total cooling output divided by the total energy consumed. Higher SEER values mean better energy performance in cooling mode.",
        typicalRange: { min: 5.2, max: 8.0 },
      },
    ],
    technicalInformation: {
      note: "The values SCOP and SEER are based on EPD and technical specifications of products for the European market.",
      rows: [
        {
          capacityKw: 3.5,
          typicalFloorAreaM2: { min: 30, max: 50 },
          scop: { min: 3.5, max: 4.5 },
          seer: { min: 6.0, max: 8.0 },
        },
        {
          capacityKw: 5.0,
          typicalFloorAreaM2: { min: 50, max: 80 },
          scop: { min: 3.2, max: 4.2 },
          seer: { min: 5.8, max: 7.5 },
        },
        {
          capacityKw: 7.0,
          typicalFloorAreaM2: { min: 80, max: 120 },
          scop: { min: 3.0, max: 4.0 },
          seer: { min: 5.5, max: 7.2 },
        },
        {
          capacityKw: 10.0,
          typicalFloorAreaM2: { min: 120, max: 160 },
          scop: { min: 2.8, max: 3.8 },
          seer: { min: 5.2, max: 6.5 },
        },
      ],
    },
    embodiedCarbon: {
      note: HEAT_PUMP_EMBODIED_CARBON_NOTE,
      dataQuality: ["single-source-datapoint"],
      entries: [
        {
          label: "3.0 - 4.0 kW",
          capacityKw: { min: 3.0, max: 4.0 },
          kgCO2e: 157,
          functionalUnit: "per-unit",
        },
      ],
    },
    installation: {
      time: {
        min: 8,
        max: 20,
        unit: "hours",
        basis: "per unit, depending on system complexity",
      },
      workConditions:
        "Requires dry conditions; outdoor unit must be elevated or sheltered.",
      method:
        "Mounting units, connecting refrigerant lines, evacuating air, and commissioning.",
    },
    maintenance: {
      tasks: [
        "Clean or replace filters.",
        "Inspect refrigerant levels and piping.",
        "Clean heat exchanger and fans.",
      ],
      frequency: "Annually.",
      expectedLifespanYears: [{ years: { min: 12, max: 20 } }],
    },
    cost: {
      entries: [],
      missingInSource: true,
    },
    provenance: {
      docxFile: "Air to Air Heat Pump.docx",
      pdfFile: "PDF files/Air to Air Heat Pump.pdf",
      extractedOn: EXTRACTED_ON,
      sourceVersionNotes:
        "Both renderings agree that the cost section is a heading with no content. The PDF's two-column layout places that heading inside the SCOP/SEER table; the Word rendering confirms it belongs to the cost section.",
    },
  },
  {
    id: "air-to-water-heat-pump",
    name: "Air to Water Heat Pump",
    category: "systems",
    relatedMeasureIds: ["air-water-heat-pump"],
    description:
      "An air-to-water heat pump extracts heat from outside air and transfers it to a water-based heating system, typically underfloor heating, radiators, or domestic hot water cylinders. It operates efficiently even in low outdoor temperatures, using electricity to run a compressor that upgrades the low-grade heat to a usable level for indoor heating. These systems are ideal for energy-efficient homes and contribute significantly to decarbonising heating.",
    // The source has an "Application" heading with no content beneath it.
    application: [],
    advantages: [
      "High energy efficiency",
      "Lower operating costs than oil/gas boilers",
      "Low carbon emissions when powered by renewable electricity",
      "Provides heating and domestic hot water",
    ],
    disadvantages: [
      "Reduced efficiency in very cold climates",
      "Higher upfront cost than gas boilers",
      "External unit can be noisy.",
    ],
    efficiencyMetrics: [
      {
        key: "scop",
        name: "SCOP (Seasonal Coefficient of Performance)",
        definition: SCOP_DEFINITION,
        typicalRange: { min: 2.8, max: 4.5 },
      },
    ],
    technicalInformation: {
      note: "The values SCOP are based on EPD and technical specifications of products for the European market.",
      rows: [
        {
          capacityKw: { min: 3, max: 5 },
          typicalFloorAreaM2: { min: 30, max: 50 },
          scop: { min: 3.24, max: 4.62 },
        },
        {
          capacityKw: { min: 5, max: 8 },
          typicalFloorAreaM2: { min: 50, max: 80 },
          scop: { min: 3.57, max: 4.18 },
        },
        {
          capacityKw: { min: 8, max: 11 },
          typicalFloorAreaM2: { min: 80, max: 110 },
          scop: { min: 3.48, max: 4.84 },
        },
        {
          capacityKw: { min: 11, max: 13 },
          typicalFloorAreaM2: { min: 110, max: 130 },
          scop: { min: 3.34, max: 4.74 },
        },
        {
          capacityKw: { min: 14, max: 15 },
          typicalFloorAreaM2: { min: 140, max: 150 },
          scop: { min: 3.26, max: 4.33 },
        },
      ],
    },
    embodiedCarbon: {
      note: HEAT_PUMP_EMBODIED_CARBON_NOTE,
      // The source makes no European-average claim for this table, unlike the
      // envelope sheets.
      dataQuality: [],
      entries: [
        {
          label: "3-5 kW",
          capacityKw: { min: 3, max: 5 },
          kgCO2e: 1180,
          functionalUnit: "per-unit",
        },
        {
          label: "5-8 kW",
          capacityKw: { min: 5, max: 8 },
          kgCO2e: 1340,
          functionalUnit: "per-unit",
        },
        {
          label: "8-11 kW",
          capacityKw: { min: 8, max: 11 },
          kgCO2e: 1400,
          functionalUnit: "per-unit",
        },
        {
          label: "11-13 kW",
          capacityKw: { min: 11, max: 13 },
          kgCO2e: 1500,
          functionalUnit: "per-unit",
        },
        {
          label: "14-15 kW",
          capacityKw: { min: 14, max: 15 },
          kgCO2e: 1730,
          functionalUnit: "per-unit",
        },
      ],
    },
    installation: {
      time: {
        min: 12,
        max: 24,
        unit: "hours",
        basis: "per installation, varies by building and capacity",
      },
      workConditions:
        "Dry environment, proper outdoor clearance for air intake.",
      method:
        "Mount external unit, connect refrigerant and hydraulic lines, integrate with buffer tank if required and commission and pressure test the system.",
    },
    maintenance: {
      tasks: [
        "Clean or replace filters.",
        "Inspect refrigerant levels and piping.",
        "Flush and treat water in closed-loop system.",
      ],
      frequency: "Annually.",
      expectedLifespanYears: [{ years: { min: 15, max: 20 } }],
    },
    cost: {
      entries: [
        {
          scope: "Total cost",
          min: 4000,
          max: 15000,
          currency: "EUR",
          unit: "total",
        },
      ],
    },
    provenance: {
      docxFile: "Air to Water Heat Pump.docx",
      pdfFile: "PDF files/Air to Water Heat Pump.pdf",
      extractedOn: EXTRACTED_ON,
      sourceVersionNotes:
        "Both renderings agree that the application section is a heading with no content.",
    },
  },
  {
    id: "condensing-boiler",
    name: "Condensing Boiler",
    category: "systems",
    relatedMeasureIds: ["condensing-boiler"],
    description:
      "A condensing boiler is a high-efficiency heating appliance that captures additional heat from flue gases by condensing water vapor in the exhaust, thereby extracting latent heat that would otherwise be lost. This process allows condensing boilers to achieve significantly higher thermal efficiencies, often above 90% compared to conventional boilers that operate at 70–80% efficiency. By lowering the temperature of flue gases below the dew point, a secondary heat exchanger recovers heat that would normally escape, improving fuel utilization and reducing greenhouse gas emissions.",
    // The source has an "Application" heading with no content beneath it.
    application: [],
    advantages: [
      "High Thermal Efficiency",
      "Lower Emissions compared to conventional boilers.",
      "Compact size and quiet operation",
    ],
    disadvantages: [
      "High Initial Cost.",
      "System Compatibility Constraints.",
      "Maintenance Sensitivity.",
    ],
    // The source's "Efficiency Metrics" section contains only a photograph, so
    // there is no metric definition to record.
    technicalInformation: {
      note: "The values of module efficiency are based on EPD and technical specifications of products for the European market.",
      // Efficiency is a single cell merged across all five capacity rows in the
      // source table; it is repeated here so every row carries it.
      rows: [
        {
          capacityKw: 5,
          typicalFloorAreaM2: { min: 50, max: 80 },
          efficiency: { min: 0.9, max: 0.95 },
        },
        {
          capacityKw: 10,
          typicalFloorAreaM2: { min: 90, max: 150 },
          efficiency: { min: 0.9, max: 0.95 },
        },
        {
          capacityKw: 14,
          typicalFloorAreaM2: { min: 140, max: 200 },
          efficiency: { min: 0.9, max: 0.95 },
        },
        {
          capacityKw: 20,
          typicalFloorAreaM2: { min: 180, max: 240 },
          efficiency: { min: 0.9, max: 0.95 },
        },
        {
          capacityKw: 25,
          typicalFloorAreaM2: { min: 200, max: 280 },
          efficiency: { min: 0.9, max: 0.95 },
        },
      ],
    },
    embodiedCarbon: {
      note: "The embodied carbon of Condensing boiler is measured as usual for . Because there is no information for each country separately, the average embodied carbon for materials with a European geographic scope is shown. In this case, embodied carbon data was only found for a 14kW mm capacity. Therefore, values for other capacities were estimated by assuming a linear relationship with thickness, dividing the 14kW value by 14 and multiplying by the respective capacity.",
      dataQuality: [
        "european-average",
        "linearly-extrapolated",
        "single-source-datapoint",
      ],
      entries: [
        {
          label: "5 kW",
          capacityKw: 5,
          kgCO2e: 410.7,
          functionalUnit: "per-unit",
          dataQuality: ["linearly-extrapolated"],
        },
        {
          label: "10 kW",
          capacityKw: 10,
          kgCO2e: 821.4,
          functionalUnit: "per-unit",
          dataQuality: ["linearly-extrapolated"],
        },
        // The single measured data point the rest of the table is derived from.
        {
          label: "14 kW",
          capacityKw: 14,
          kgCO2e: 1150,
          functionalUnit: "per-unit",
        },
        {
          label: "20 kW",
          capacityKw: 20,
          kgCO2e: 1642.8,
          functionalUnit: "per-unit",
          dataQuality: ["linearly-extrapolated"],
        },
        {
          label: "25 kW",
          capacityKw: 25,
          kgCO2e: 2053.6,
          functionalUnit: "per-unit",
          dataQuality: ["linearly-extrapolated"],
        },
      ],
    },
    installation: {
      time: {
        min: 1,
        max: 3,
        unit: "days",
        basis: "per system, depending on size",
      },
      method:
        "Mount boiler on wall, connect to gas, water, flue, and electricity and test pressure and combustion settings.",
    },
    maintenance: {
      tasks: [
        "Clean heat exchanger and burner.",
        "Verify and adjust system pressure as needed.",
      ],
      frequency: "Annual inspection recommended.",
      expectedLifespanYears: [{ years: { min: 15, max: 20 } }],
    },
    cost: {
      entries: [
        {
          scope: "Total cost",
          min: 1800,
          max: 6000,
          currency: "EUR",
          unit: "total",
        },
      ],
    },
    provenance: {
      docxFile: "Condensing Boiler.docx",
      pdfFile: "PDF files/Condensing Boiler.pdf",
      extractedOn: EXTRACTED_ON,
      sourceVersionNotes:
        "The module efficiency cell is vertically merged across all five capacity rows. The Word conversion emits it against the 5 kW row only; the PDF layout shows it centred across the whole table, which is the reading recorded here. The application section is a heading with no content in both renderings.",
    },
  },
] as const satisfies readonly TechnicalSheet[];
