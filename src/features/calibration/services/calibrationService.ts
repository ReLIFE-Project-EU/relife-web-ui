import { BuildingService } from "../../../services/BuildingService";
import { EnergyService } from "../../../services/EnergyService";
import { FinancialService } from "../../../services/FinancialService";
import type {
  IBuildingService,
  IEnergyService,
  IFinancialService,
} from "../../../services/types";
import type { ArchetypeDetails } from "../../../types/archetype";
import type { BuildingInfo, EstimationResult } from "../../../types/renovation";
import { mapWithConcurrencyLimit } from "../../../utils/concurrency";
import { countryNamesEqual } from "../../../utils/countries";
import {
  BUILDING_CASES,
  CALIBRATION_COUNTRIES,
  COST_PROBES,
  costCaseId,
} from "../referenceCases";

export type CheckState<T> =
  | { status: "loading" }
  | { status: "success"; value: T }
  | { status: "error"; message: string };

export interface CostValues {
  capex: number;
  euroPerM2?: number;
}

export interface EnergyIntensities {
  heating: number;
  cooling: number;
  delivered?: number;
  primary?: number;
}

export type CalibrationUpdate =
  | { kind: "cost"; id: string; state: CheckState<CostValues> }
  | { kind: "building"; id: string; state: CheckState<ArchetypeDetails> }
  | { kind: "energy"; id: string; state: CheckState<EnergyIntensities> };

export interface CalibrationServices {
  building: Pick<IBuildingService, "getArchetypes" | "getArchetypeDetails">;
  energy: Pick<IEnergyService, "estimateEPC">;
  financial: Pick<IFinancialService, "estimatePackageCosts">;
}

function createServices(): CalibrationServices {
  const building = new BuildingService();
  return {
    building,
    energy: new EnergyService(building),
    financial: new FinancialService(),
  };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildingInput(
  details: ArchetypeDetails,
  period: string,
): BuildingInfo {
  return {
    country: details.country,
    lat: details.location.lat,
    lng: details.location.lng,
    buildingType: details.category,
    constructionPeriod: period,
    selectedArchetype: {
      country: details.country,
      category: details.category,
      name: details.name,
    },
    isModified: false,
    floorArea: details.floorArea,
    numberOfFloors: details.numberOfFloors,
    climateZone: "",
    heatingTechnology: "",
    coolingTechnology: "",
    hotWaterTechnology: "",
    numberOfOpenings: null,
    glazingTechnology: "",
    constructionYear: null,
    floorNumber: null,
    projectLifetime: 20,
  };
}

export function energyIntensities(
  estimation: EstimationResult,
  floorArea: number,
): EnergyIntensities {
  if (!Number.isFinite(floorArea) || floorArea <= 0) {
    throw new Error(
      "Reference floor area must be positive to calculate energy per m².",
    );
  }
  const perArea = (value: number): number => {
    if (!Number.isFinite(value))
      throw new Error("Simulation returned a non-finite energy value.");
    return value / floorArea;
  };
  return {
    heating: perArea(estimation.heatingDemand),
    cooling: perArea(estimation.coolingDemand),
    delivered:
      estimation.deliveredTotal === undefined
        ? undefined
        : perArea(estimation.deliveredTotal),
    primary:
      estimation.primaryEnergy === undefined
        ? undefined
        : perArea(estimation.primaryEnergy),
  };
}

async function check<T>(
  task: () => Promise<T>,
  update: (state: CheckState<T>) => void,
): Promise<void> {
  update({ status: "loading" });
  try {
    update({ status: "success", value: await task() });
  } catch (error) {
    update({ status: "error", message: errorMessage(error) });
  }
}

export async function runCalibration(
  update: (event: CalibrationUpdate) => void,
  services: CalibrationServices = createServices(),
): Promise<void> {
  let catalog: Awaited<ReturnType<IBuildingService["getArchetypes"]>> = [];
  let catalogError: string | undefined;
  try {
    catalog = await services.building.getArchetypes();
  } catch (error) {
    catalogError = `Could not load the archetype catalog: ${errorMessage(error)}`;
  }

  const costJobs = CALIBRATION_COUNTRIES.flatMap((country) =>
    COST_PROBES.map((probe) => async () => {
      const id = costCaseId(country, probe);
      await check(
        async () => {
          const result = await services.financial.estimatePackageCosts({
            country,
            renovationActions: [probe.action],
          });
          if (!Number.isFinite(result.capex) || result.capex <= 0) {
            throw new Error("Cost lookup returned an invalid CAPEX value.");
          }
          if (!result.capexFromLookup)
            throw new Error(
              "The service did not confirm a reference-data cost lookup.",
            );
          return {
            capex: result.capex,
            ...(probe.action.area_m2 !== undefined
              ? { euroPerM2: result.capex / probe.action.area_m2 }
              : {}),
          };
        },
        (state) => update({ kind: "cost", id, state }),
      );
    }),
  );

  const buildingJobs = BUILDING_CASES.map((reference) => async () => {
    const id = reference.name;
    const archetype = catalog.find(
      (item) =>
        item.name === reference.name &&
        item.category === reference.category &&
        countryNamesEqual(item.country, reference.country),
    );
    if (catalogError || !archetype) {
      const state = {
        status: "error",
        message:
          catalogError ??
          `Reference archetype ${id} is unavailable. No substitute was used.`,
      } as const;
      update({ kind: "building", id, state });
      update({ kind: "energy", id, state });
      return;
    }

    let details: ArchetypeDetails | undefined;
    await check(
      async () => {
        details = await services.building.getArchetypeDetails(archetype);
        return details;
      },
      (state) => update({ kind: "building", id, state }),
    );
    if (!details) {
      update({
        kind: "energy",
        id,
        state: {
          status: "error",
          message:
            "Energy calculation unavailable because building details could not be loaded.",
        },
      });
      return;
    }

    const loadedDetails = details;
    await check(
      async () => {
        if (
          !Number.isFinite(loadedDetails.floorArea) ||
          loadedDetails.floorArea <= 0
        ) {
          throw new Error(
            "Reference floor area must be positive to run the simulation.",
          );
        }
        const { estimation } = await services.energy.estimateEPC(
          buildingInput(loadedDetails, reference.period),
        );
        return energyIntensities(estimation, loadedDetails.floorArea);
      },
      (state) => update({ kind: "energy", id, state }),
    );
  });

  await mapWithConcurrencyLimit([...costJobs, ...buildingJobs], 2, (job) =>
    job(),
  );
}
