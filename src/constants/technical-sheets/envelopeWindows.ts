/**
 * Window technical sheets: aluminium, PVC, wood.
 *
 * All three key their tables on glazing configuration rather than a numeric
 * dimension, and all three quote costs per m² of window area.
 */

import type { TechnicalSheet } from "./types";

const EXTRACTED_ON = "2026-07-31";

const EPD_EUROPEAN_MARKET_NOTE =
  "The values of the thermal resistances are based on EPD and technical specifications of products for the European market.";

const WINDOW_EMBODIED_CARBON_NOTE =
  "The embodied carbon of windows is measured as usual for 1 m2 of material. Because there is no information for each country separately, the average embodied carbon for materials with a European geographic scope is shown.";

export const WINDOW_SHEETS = [
  {
    id: "aluminium-window",
    name: "Aluminium window",
    category: "envelope",
    relatedMeasureIds: ["windows"],
    description:
      "Aluminium window systems with thermal breaks are used in modern buildings for their durability, sleek aesthetics, and energy performance. These systems integrate low-emissivity glazing (double or triple) and advanced gaskets for air, water, and sound insulation. Common systems include tilt-and-turn and casement types.",
    application: [
      "Used in residential façades.",
      "Suitable for high-performance retrofits.",
      "Integrated with curtain walls or solid walls",
      "Fixed, operable, or mixed configurations",
    ],
    advantages: ["Durability and Longevity", "Low maintenance once installed."],
    disadvantages: [
      "High Initial Cost",
      "Lower thermal insulation without thermal breaks.",
    ],
    technicalInformation: {
      note: EPD_EUROPEAN_MARKET_NOTE,
      rows: [
        { glazing: "double", thermalResistanceM2KW: 0.71 },
        { glazing: "triple", thermalResistanceM2KW: 1.11 },
      ],
    },
    embodiedCarbon: {
      note: WINDOW_EMBODIED_CARBON_NOTE,
      dataQuality: ["european-average"],
      entries: [
        {
          label: "Double Glazed",
          glazing: "double",
          kgCO2e: 105,
          functionalUnit: "per-m2",
        },
        {
          label: "Triple Glazed",
          glazing: "triple",
          kgCO2e: 121,
          functionalUnit: "per-m2",
        },
      ],
    },
    installation: {
      time: { min: 1, max: 4, unit: "hours", basis: "per unit" },
    },
    maintenance: {
      tasks: [
        "Clean aluminium frames and glazing.",
        "Lubricate moving parts.",
        "Inspect and replace weather seals as needed.",
      ],
      frequency: "Every 2 – 5 years.",
      expectedLifespanYears: [{ years: { min: 40, max: 60 } }],
    },
    cost: {
      entries: [
        {
          scope: "Total cost",
          min: 200,
          max: 1050,
          currency: "EUR",
          unit: "per-m2",
        },
      ],
    },
    provenance: {
      docxFile: "Aluminium Windows.docx",
      pdfFile: "PDF files/Aluminium Windows.pdf",
      extractedOn: EXTRACTED_ON,
    },
  },
  {
    id: "pvc-window",
    name: "PVC window",
    category: "envelope",
    relatedMeasureIds: ["windows"],
    description:
      "PVC (polyvinyl chloride) windows are widely used in residential buildings due to their cost-effectiveness, good thermal insulation, and low maintenance. These window systems typically feature double- or triple-glazed sealed units set within reinforced PVC frames. PVC windows can be fabricated in various opening types, including casement, tilt-and-turn, or sliding sash, making them adaptable for most home styles.",
    application: [
      "Suitable for single-family homes.",
      "Suitable for apartments and multi-unit residential buildings.",
      "Suitable for renovation and energy retrofit projects.",
      "Common configurations: fixed or operable units.",
      "Common configurations: casement, sliding, or tilt-and-turn systems.",
    ],
    advantages: [
      "Affordable and widely available.",
      "Good thermal insulation.",
      "Low maintenance: resistant to rot, corrosion, and pests.",
    ],
    disadvantages: [
      "Lower structural strength than aluminium or wood.",
      "Over long periods, it is susceptible to discoloration or brittleness.",
    ],
    technicalInformation: {
      note: EPD_EUROPEAN_MARKET_NOTE,
      rows: [
        { glazing: "double", thermalResistanceM2KW: 0.83 },
        { glazing: "triple", thermalResistanceM2KW: 1.25 },
      ],
    },
    embodiedCarbon: {
      note: WINDOW_EMBODIED_CARBON_NOTE,
      dataQuality: ["european-average"],
      entries: [
        {
          label: "Double Glazed",
          glazing: "double",
          kgCO2e: 86,
          functionalUnit: "per-m2",
        },
        {
          label: "Triple Glazed",
          glazing: "triple",
          kgCO2e: 116,
          functionalUnit: "per-m2",
        },
      ],
    },
    installation: {
      time: { min: 1, max: 4, unit: "hours", basis: "per unit" },
    },
    maintenance: {
      tasks: [
        "Clean frames and glazing.",
        "Lubricate moving parts.",
        "Inspect and replace weather seals as needed.",
      ],
      frequency: "Every 2 – 5 years.",
      expectedLifespanYears: [{ years: { min: 30, max: 50 } }],
    },
    cost: {
      entries: [
        {
          scope: "Total cost",
          min: 140,
          max: 950,
          currency: "EUR",
          unit: "per-m2",
        },
      ],
    },
    provenance: {
      docxFile: "PVC Windows.docx",
      pdfFile: "PDF files/PVC Windows.pdf",
      extractedOn: EXTRACTED_ON,
    },
  },
  {
    id: "wood-window",
    name: "Wooden window",
    category: "envelope",
    relatedMeasureIds: ["windows"],
    description:
      "Wooden window frames combined with double- or triple-glazed units a alternative to aluminium or PVC frames. They offer improved thermal performance, a warm aesthetic, and potential carbon sequestration benefits.",
    application: [
      "Used in residential and commercial façades",
      "Suitable for new construction and high-performance retrofits",
      "Integrated with curtain walls or solid walls",
      "Fixed, operable, or mixed configurations",
    ],
    advantages: [
      "Excellent thermal insulation.",
      "Renewable & biodegradable material.",
    ],
    disadvantages: [
      "Requires regular maintenance",
      "Sensitive to moisture and UV.",
    ],
    technicalInformation: {
      note: EPD_EUROPEAN_MARKET_NOTE,
      rows: [
        { glazing: "double", thermalResistanceM2KW: 1 },
        { glazing: "triple", thermalResistanceM2KW: 1.33 },
      ],
    },
    embodiedCarbon: {
      note: WINDOW_EMBODIED_CARBON_NOTE,
      dataQuality: ["european-average"],
      entries: [
        {
          label: "Double Glazed",
          glazing: "double",
          kgCO2e: 40,
          functionalUnit: "per-m2",
        },
        {
          label: "Triple Glazed",
          glazing: "triple",
          kgCO2e: 81,
          functionalUnit: "per-m2",
        },
      ],
    },
    installation: {
      time: { min: 1, max: 4, unit: "hours", basis: "per unit" },
      method: "Mechanical fixing (screws/brackets), insulation foam/sealant.",
    },
    maintenance: {
      tasks: [
        "Repainting every 5–10 years",
        "Clean frames and glazing.",
        "Lubricate moving parts.",
        "Inspect and replace weather seals as needed.",
        "Checking for wood degradation or surface cracks",
      ],
      frequency: "5–10 years (depends on climate and finish type)",
      expectedLifespanYears: [{ years: { min: 30, max: 60 } }],
    },
    cost: {
      entries: [
        {
          scope: "Total cost",
          min: 500,
          max: 1100,
          currency: "EUR",
          unit: "per-m2",
        },
      ],
    },
    provenance: {
      docxFile: "Wood Windows.docx",
      pdfFile: "PDF files/Wood Windows.pdf",
      extractedOn: EXTRACTED_ON,
      sourceVersionNotes:
        "Both renderings agree. The thermal resistance table uses decimal points (1, 1.33) where the other window sheets use commas; the values themselves are unambiguous.",
    },
  },
] as const satisfies readonly TechnicalSheet[];
