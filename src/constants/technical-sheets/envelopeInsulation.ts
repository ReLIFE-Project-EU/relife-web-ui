/**
 * Insulation technical sheets: EPS, XPS, mineral wool.
 *
 * Transcribed from the `.docx` and `.pdf` renderings of each sheet, reconciled
 * against each other. See `README.md` for the data-quality register — in
 * particular, XPS carries values identical to EPS in the source.
 */

import type { TechnicalSheet } from "./types";

const EXTRACTED_ON = "2026-07-31";

/** Shared across insulation and window sheets, which quote it verbatim. */
const EPD_EUROPEAN_MARKET_NOTE =
  "The values of the thermal resistances are based on EPD and technical specifications of products for the European market.";

const EUROPEAN_AVERAGE_NOTE =
  "The embodied carbon of insulation panels is measured as usual for 1 m2 of material. Because there is no information for each country separately, the average embodied carbon for materials with a European geographic scope is shown.";

const INSULATION_MEASURE_IDS = [
  "wall-insulation",
  "roof-insulation",
  "floor-insulation",
] as const;

export const INSULATION_SHEETS = [
  {
    id: "eps-insulation",
    name: "EPS insulation",
    category: "envelope",
    relatedMeasureIds: INSULATION_MEASURE_IDS,
    description:
      "Expanded Polystyrene (EPS) is a lightweight, rigid insulation material widely used in external wall insulation systems. Composed of expanded polystyrene beads, EPS offers good thermal resistance, cost-efficiency, and ease of handling. Its open-cell structure allows for breathability while providing effective insulation for façades, walls, and roofs.",
    application: [
      "Thermal Insulation: EPS boards available in multiple thicknesses.",
      "Fastening System: Adhesives and/or mechanical anchors.",
      "Reinforcement Layer: Fiberglass mesh embedded in basecoat.",
      "Finishing Layer: Decorative or protective coatings, such as acrylic render or paint.",
    ],
    advantages: [
      "Cost-effective compared to other rigid insulations.",
      "Lightweight and easy to cut, handle, and install.",
      "Decent thermal performance per unit thickness.",
      "Compatible with various finish systems.",
    ],
    disadvantages: [
      "Lower compressive strength than XPS.",
      "Susceptible to water absorption without proper coating.",
      "Not suitable for constant wet conditions or below-grade use.",
    ],
    technicalInformation: {
      note: EPD_EUROPEAN_MARKET_NOTE,
      rows: [
        { thicknessMm: 20, thermalResistanceM2KW: 0.55 },
        { thicknessMm: 30, thermalResistanceM2KW: 0.85 },
        { thicknessMm: 40, thermalResistanceM2KW: 1.18 },
        { thicknessMm: 50, thermalResistanceM2KW: 1.48 },
        { thicknessMm: 60, thermalResistanceM2KW: 1.78 },
        { thicknessMm: 80, thermalResistanceM2KW: 2.3 },
        { thicknessMm: 100, thermalResistanceM2KW: 2.88 },
        { thicknessMm: 120, thermalResistanceM2KW: 3.5 },
      ],
    },
    embodiedCarbon: {
      note: EUROPEAN_AVERAGE_NOTE,
      dataQuality: ["european-average"],
      entries: [
        {
          label: "20 mm",
          thicknessMm: 20,
          kgCO2e: 1.9,
          functionalUnit: "per-m2",
        },
        {
          label: "30 mm",
          thicknessMm: 30,
          kgCO2e: 2.46,
          functionalUnit: "per-m2",
        },
        {
          label: "40 mm",
          thicknessMm: 40,
          kgCO2e: 3.27,
          functionalUnit: "per-m2",
        },
        {
          label: "50 mm",
          thicknessMm: 50,
          kgCO2e: 4.74,
          functionalUnit: "per-m2",
        },
        {
          label: "60 mm",
          thicknessMm: 60,
          kgCO2e: 4.89,
          functionalUnit: "per-m2",
        },
        {
          label: "80 mm",
          thicknessMm: 80,
          kgCO2e: 6.54,
          functionalUnit: "per-m2",
        },
        {
          label: "100 mm",
          thicknessMm: 100,
          kgCO2e: 6.74,
          functionalUnit: "per-m2",
        },
        {
          label: "120 mm",
          thicknessMm: 120,
          kgCO2e: 7.2,
          functionalUnit: "per-m2",
        },
      ],
    },
    installation: {
      time: { min: 40, max: 70, unit: "hours", basis: "per 100 m²" },
      workConditions:
        "Dry, clean surfaces with moderate temperature conditions.",
      method:
        "Adhesive application, mechanical fixing, basecoat and mesh embedding, followed by final render or coating.",
    },
    maintenance: {
      tasks: [
        "Inspect render and joints periodically.",
        "Repair cracks and recoat surfaces as needed.",
      ],
      frequency: "Every 5–10 years, depending on environmental exposure.",
      expectedLifespanYears: [{ years: { min: 25, max: 50 } }],
    },
    cost: {
      note: "Prices vary by country.",
      entries: [
        {
          scope: "Wall insulation with EPS boards",
          min: 35,
          max: 150,
          currency: "EUR",
          unit: "per-m2",
        },
        {
          scope: "Floor insulation with EPS boards",
          min: 30,
          max: 200,
          currency: "EUR",
          unit: "per-m2",
          note: "Depending on flooring type such as tiles, marble, or wood.",
        },
      ],
    },
    provenance: {
      docxFile: "EPS.docx",
      pdfFile: "PDF files/EPS.pdf",
      extractedOn: EXTRACTED_ON,
    },
  },
  {
    id: "xps-insulation",
    name: "XPS insulation",
    category: "envelope",
    relatedMeasureIds: INSULATION_MEASURE_IDS,
    description:
      "External insulation systems frequently use extruded polystyrene (XPS) insulation as a rigid foam board. This material is ideal for insulating façades, floors, and roofs due to its excellent thermal resistance, low water absorption, and high compressive strength. Its closed-cell structure enhances durability and moisture protection.",
    application: [
      "Thermal insulation: XPS boards of various thicknesses.",
      "Fastening system: Adhesives or mechanical anchors.",
      "Protective/render layers: Plaster or weather-resistant cladding.",
      "Finishing: Paint or textured coatings.",
    ],
    advantages: [
      // Truncated mid-sentence in both source renderings.
      "High R-value/mm: Superior thermal",
      "Exceptional moisture resistance.",
      "Low maintenance once installed.",
    ],
    disadvantages: [
      "Higher cost: More expensive than most alternatives.",
      "Greater density: Heavier and harder to install.",
    ],
    technicalInformation: {
      note: EPD_EUROPEAN_MARKET_NOTE,
      rows: [
        { thicknessMm: 20, thermalResistanceM2KW: 0.55 },
        { thicknessMm: 30, thermalResistanceM2KW: 0.85 },
        { thicknessMm: 40, thermalResistanceM2KW: 1.18 },
        { thicknessMm: 50, thermalResistanceM2KW: 1.48 },
        { thicknessMm: 60, thermalResistanceM2KW: 1.78 },
        { thicknessMm: 80, thermalResistanceM2KW: 2.3 },
        { thicknessMm: 100, thermalResistanceM2KW: 2.88 },
        { thicknessMm: 120, thermalResistanceM2KW: 3.5 },
      ],
    },
    embodiedCarbon: {
      note: EUROPEAN_AVERAGE_NOTE,
      dataQuality: ["european-average", "suspected-duplicate"],
      entries: [
        {
          label: "20 mm",
          thicknessMm: 20,
          kgCO2e: 1.9,
          functionalUnit: "per-m2",
        },
        {
          label: "30 mm",
          thicknessMm: 30,
          kgCO2e: 2.46,
          functionalUnit: "per-m2",
        },
        {
          label: "40 mm",
          thicknessMm: 40,
          kgCO2e: 3.27,
          functionalUnit: "per-m2",
        },
        {
          label: "50 mm",
          thicknessMm: 50,
          kgCO2e: 4.74,
          functionalUnit: "per-m2",
        },
        {
          label: "60 mm",
          thicknessMm: 60,
          kgCO2e: 4.89,
          functionalUnit: "per-m2",
        },
        {
          label: "80 mm",
          thicknessMm: 80,
          kgCO2e: 6.54,
          functionalUnit: "per-m2",
        },
        {
          label: "100 mm",
          thicknessMm: 100,
          kgCO2e: 6.74,
          functionalUnit: "per-m2",
        },
        {
          label: "120 mm",
          thicknessMm: 120,
          kgCO2e: 7.2,
          functionalUnit: "per-m2",
        },
      ],
    },
    installation: {
      time: { min: 50, max: 80, unit: "hours", basis: "per 100 m²" },
      workConditions:
        "Avoid extreme temperatures or rain, substrate must be clean and dry.",
      method:
        "Boards are fixed using adhesive and mechanical anchors, followed by mesh embedding and finish layer.",
    },
    maintenance: {
      tasks: [
        "Visual inspections of façade and joints.",
        "Repair of cracks, damaged render, or exposed insulation.",
        "Reapplication of surface coatings if degraded.",
      ],
      frequency: "Every 5–10 years, depending on environmental exposure.",
      expectedLifespanYears: [{ years: { min: 30, max: 60 } }],
    },
    cost: {
      note: "Prices vary by country.",
      entries: [
        {
          scope: "Wall insulation with XPS boards",
          min: 50,
          max: 100,
          currency: "EUR",
          unit: "per-m2",
        },
        {
          scope: "Accessible attic insulation with XPS boards",
          min: 15,
          max: 170,
          currency: "EUR",
          unit: "per-m2",
        },
        {
          scope: "Roof insulation makeover with XPS boards",
          min: 150,
          max: 200,
          currency: "EUR",
          unit: "per-m2",
        },
      ],
    },
    provenance: {
      docxFile: "XPS.docx",
      pdfFile: "PDF files/XPS.pdf",
      extractedOn: EXTRACTED_ON,
      sourceVersionNotes:
        "Both renderings agree. Note that the thermal resistance and embodied carbon tables are identical to the EPS sheet's, which is a source-document issue rather than a transcription error.",
    },
  },
  {
    id: "mineral-wool-insulation",
    name: "Mineral Wool insulation",
    category: "envelope",
    relatedMeasureIds: INSULATION_MEASURE_IDS,
    description:
      "Mineral wool insulations an inorganic, fibrous insulation produced by melting rock or recycled glass and spinning it into fibers. It offers good thermal conductivity used in external wall applications. Mineral wool is non-combustible, resistant to rot, mold, and pests, and maintains long-term performance even under varying environmental conditions.",
    application: [
      "Thermal Insulation — Exterior façade: rigid or semi-rigid mineral wool boards for ETICS.",
      "Thermal Insulation — Interior façades/cavity walls/partitions: batts or slabs fitted between studs or within cavities.",
      "Thermal Insulation — Roofs, pitched roofs/attics: rolls or slabs placed between rafters or laid over attic floors.",
      "Thermal Insulation — Roofs, flat roofs: rigid mineral wool boards installed under waterproofing membranes in warm roof constructions.",
      "Fastening System: adhesives and mechanical anchors for exterior boards, friction-fit or retainers for interior batts, mechanical fixing under membranes for roof boards.",
      "Reinforcement Layer (for ETICS): fiberglass mesh embedded in a basecoat.",
      "Protective/Finishing Layer: render, cladding, or paint/coating systems as appropriate.",
    ],
    advantages: [
      "Thermal performance.",
      "Moisture management.",
      "Fire resistance.",
      "Acoustic insulation.",
    ],
    disadvantages: [
      "Hazardous Installation.",
      "Higher Costs.",
      "Heavier Weight.",
    ],
    technicalInformation: {
      note: EPD_EUROPEAN_MARKET_NOTE,
      rows: [
        { thicknessMm: 20, thermalResistanceM2KW: 0.57 },
        { thicknessMm: 30, thermalResistanceM2KW: 0.86 },
        { thicknessMm: 40, thermalResistanceM2KW: 1.14 },
        { thicknessMm: 50, thermalResistanceM2KW: 1.43 },
        { thicknessMm: 60, thermalResistanceM2KW: 1.71 },
        { thicknessMm: 80, thermalResistanceM2KW: 2.29 },
        { thicknessMm: 100, thermalResistanceM2KW: 2.86 },
        { thicknessMm: 120, thermalResistanceM2KW: 3.43 },
      ],
    },
    embodiedCarbon: {
      note: "The embodied carbon of insulation panels is measured as usual for 1 m2 of material. Because there is no information for each country separately, the average embodied carbon for materials with a European geographic scope is shown. In this case, embodied carbon data was only found for a 100 mm thickness. Therefore, values for other thicknesses were estimated by assuming a linear relationship with thickness, dividing the 100 mm value by 100 and multiplying by the respective thickness.",
      dataQuality: [
        "european-average",
        "linearly-extrapolated",
        "single-source-datapoint",
      ],
      entries: [
        {
          label: "20 mm",
          thicknessMm: 20,
          kgCO2e: 1.33,
          functionalUnit: "per-m2",
          dataQuality: ["linearly-extrapolated"],
        },
        {
          label: "30 mm",
          thicknessMm: 30,
          kgCO2e: 2.0,
          functionalUnit: "per-m2",
          dataQuality: ["linearly-extrapolated"],
        },
        {
          label: "40 mm",
          thicknessMm: 40,
          kgCO2e: 2.67,
          functionalUnit: "per-m2",
          dataQuality: ["linearly-extrapolated"],
        },
        {
          label: "50 mm",
          thicknessMm: 50,
          kgCO2e: 3.34,
          functionalUnit: "per-m2",
          dataQuality: ["linearly-extrapolated"],
        },
        {
          label: "60 mm",
          thicknessMm: 60,
          kgCO2e: 4.0,
          functionalUnit: "per-m2",
          dataQuality: ["linearly-extrapolated"],
        },
        {
          label: "80 mm",
          thicknessMm: 80,
          kgCO2e: 5.34,
          functionalUnit: "per-m2",
          dataQuality: ["linearly-extrapolated"],
        },
        // The single measured data point the rest of the table is derived from.
        {
          label: "100 mm",
          thicknessMm: 100,
          kgCO2e: 6.67,
          functionalUnit: "per-m2",
        },
        {
          label: "120 mm",
          thicknessMm: 120,
          kgCO2e: 8.0,
          functionalUnit: "per-m2",
          dataQuality: ["linearly-extrapolated"],
        },
      ],
    },
    installation: {
      time: { min: 40, max: 70, unit: "hours", basis: "per 100 m²" },
      workConditions:
        "Dry, clean surfaces with moderate temperature conditions.",
      method:
        "Adhesive application, mechanical fixing, basecoat and mesh embedding, followed by final render or coating.",
    },
    maintenance: {
      tasks: [],
      missingInSource: true,
    },
    cost: {
      note: "Prices vary by country.",
      entries: [
        {
          scope: "Wall insulation with mineral wool",
          min: 30,
          max: 150,
          currency: "EUR",
          unit: "per-m2",
        },
        {
          scope: "Accessible attic insulation with mineral wool",
          min: 15,
          max: 170,
          currency: "EUR",
          unit: "per-m2",
        },
        {
          scope: "Roof insulation makeover with mineral wool",
          min: 150,
          max: 200,
          currency: "EUR",
          unit: "per-m2",
        },
        {
          scope: "Floor insulation with mineral wool",
          min: 50,
          max: 160,
          currency: "EUR",
          unit: "per-m2",
          note: "Depending on flooring type such as tiles, marble, or wood.",
        },
      ],
    },
    provenance: {
      docxFile: "MW.docx",
      pdfFile: "PDF files/MW.pdf",
      extractedOn: EXTRACTED_ON,
      sourceVersionNotes:
        "Both renderings agree, including the empty maintenance section.",
    },
  },
] as const satisfies readonly TechnicalSheet[];
