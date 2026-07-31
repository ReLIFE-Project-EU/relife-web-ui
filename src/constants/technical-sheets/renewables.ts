/**
 * On-site renewable technical sheets: photovoltaic system, solar thermal system.
 *
 * Both sheets break embodied carbon down by component rather than by a single
 * sizing dimension, and the PV sheet mixes two functional units in one table
 * (per Wp for panels, per unit for the inverter).
 */

import type { TechnicalSheet } from "./types";

const EXTRACTED_ON = "2026-07-31";

const MODULE_EFFICIENCY_NOTE =
  "The values of module efficiency are based on EPD and technical specifications of products for the European market.";

export const RENEWABLE_SHEETS = [
  {
    id: "photovoltaic-system",
    name: "Photovoltaic System",
    category: "renewable",
    relatedMeasureIds: ["pv"],
    description:
      "A photovoltaic (PV) system converts sunlight directly into electricity using semiconductor materials, typically silicon-based solar cells. These systems are widely adopted in residential, commercial, and utility-scale energy projects to reduce electricity bills, lower emissions, and increase energy independence.",
    application: [
      "Photovoltaic (PV) systems generate electricity from sunlight and are used in residential rooftops, commercial buildings, and solar farms. They support grid-tied and off-grid energy solutions.",
      "PV modules (mono- or poly-crystalline)",
      "Mounting system",
      "Inverter",
      "DC/AC wiring",
    ],
    advantages: [
      "Renewable, emission-free electricity generation.",
      "Scalable from small rooftops to solar farms.",
      "Low operational and maintenance costs.",
    ],
    disadvantages: [
      "High Initial cost",
      "Output depends on weather conditions.",
    ],
    technicalInformation: {
      note: MODULE_EFFICIENCY_NOTE,
      // Source gives percentages (18-22, 15-18); normalized to fractions.
      rows: [
        { panelType: "monocrystalline", efficiency: { min: 0.18, max: 0.22 } },
        { panelType: "polycrystalline", efficiency: { min: 0.15, max: 0.18 } },
      ],
    },
    embodiedCarbon: {
      note: "The embodied carbon of Photovoltaic panels is measured as usual for 1 Wp and for Inverter per unit. Because there is no information for each country separately, the average embodied carbon for materials with a European geographic scope is shown.",
      dataQuality: ["european-average"],
      entries: [
        {
          label: "Photovoltaic",
          kgCO2e: 0.597,
          functionalUnit: "per-wp",
        },
        {
          label: "Inverter 3000 Watt",
          kgCO2e: 1040,
          functionalUnit: "per-unit",
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
        "Fix mounting frame, install panels, connect wiring and inverter, commission system.",
    },
    maintenance: {
      tasks: [
        "Clean panel surfaces (every 6–12 months).",
        "Inspect electrical connections and inverter performance.",
      ],
      frequency: "Annual inspection recommended.",
      expectedLifespanYears: [
        { scope: "Panels", years: { min: 25, max: 30 } },
        { scope: "Inverter", years: { min: 10, max: 15 } },
      ],
    },
    cost: {
      entries: [
        {
          scope: "Total cost for the whole system",
          min: 1000,
          max: 20000,
          currency: "EUR",
          unit: "total",
        },
      ],
    },
    provenance: {
      docxFile: "Photovoltaic.docx",
      pdfFile: "PDF files/Photovoltaic.pdf",
      extractedOn: EXTRACTED_ON,
    },
  },
  {
    id: "solar-thermal-system",
    name: "Solar Thermal System",
    category: "renewable",
    relatedMeasureIds: ["solar-thermal"],
    description:
      "A Solar Thermal System captures solar energy to heat water for residential domestic use. It typically consists of solar collectors (flat-plate or evacuated tube), a hot water storage tank, a circulation pump, and a control unit. The solar energy heats water either directly or via a heat exchanger, significantly reducing the need for conventional energy sources. When solar input is insufficient, an auxiliary system (e.g., electric heater or gas boiler) supplements the hot water supply.",
    application: [
      "Used in single-family homes.",
      "Used in apartments.",
      "Typical application: domestic hot water (DHW).",
      "Typical application: preheating water for boilers.",
      "Typical application: integration with underfloor heating.",
      "System component: solar collectors.",
      "System component: storage tank.",
      "System component: circulation pump (if needed).",
      "System component: expansion vessel, controller, piping, and valves.",
    ],
    advantages: [
      "Reduces household energy bills.",
      "Lowers dependence on fossil fuels.",
      "Long lifespan with minimal operational cost.",
    ],
    disadvantages: [
      "High initial cost.",
      "Output depends on weather conditions.",
    ],
    technicalInformation: {
      note: MODULE_EFFICIENCY_NOTE,
      // The source column labelled "Typical Area (m²)" is collector aperture
      // area here, not the served floor area the HVAC sheets report.
      rows: [
        {
          householdSizePersons: { min: 3, max: 4 },
          collectorAreaM2: { min: 2, max: 4 },
          storageCapacityL: { min: 150, max: 200 },
        },
        {
          householdSizePersons: { min: 4, max: 6 },
          collectorAreaM2: { min: 3, max: 5 },
          storageCapacityL: { min: 200, max: 300 },
        },
      ],
    },
    embodiedCarbon: {
      // The source presents this table with no explanatory note.
      dataQuality: [],
      entries: [
        {
          label: "Evacuated tube system (2-3 m2)",
          kgCO2e: 828,
          functionalUnit: "per-unit",
        },
        {
          label: "200 L storage tank",
          kgCO2e: 158,
          functionalUnit: "per-unit",
        },
      ],
    },
    installation: {
      time: {
        min: 1,
        max: 2,
        unit: "days",
        basis: "per residential setup",
      },
      method:
        "Mount collectors on a south-facing sloped roof, install and insulate tank and pipes, connect electrical and hydraulic components and fill with thermal fluid, pressure test, and commission system",
    },
    maintenance: {
      tasks: [
        "Clean collector surface.",
        "Check pump, controller, valves, and expansion vessel.",
        "Inspect antifreeze and pressure.",
      ],
      frequency: "Annually.",
      expectedLifespanYears: [{ years: { min: 10, max: 25 } }],
    },
    cost: {
      entries: [
        {
          scope: "Total cost",
          min: 750,
          max: 57000,
          currency: "EUR",
          unit: "total",
        },
      ],
    },
    provenance: {
      docxFile: "Solar Thermal System.docx",
      pdfFile: "PDF files/Solar Thermal System.pdf",
      extractedOn: EXTRACTED_ON,
      sourceVersionNotes:
        "Both renderings agree. The technical information note refers to module efficiency, but the table beneath it reports household sizing rather than efficiency; the note is transcribed as written.",
    },
  },
] as const satisfies readonly TechnicalSheet[];
