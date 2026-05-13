import { buildingService } from "../../../services/BuildingService";
import type { IBuildingService } from "../../../services/types";
import type { ArchetypeInfo } from "../../../types/forecasting";
import {
  RSE_UNAVAILABLE_REASONS,
  type RSEUnavailableReason,
} from "../constants";
import type {
  RSEArchetypeRef,
  RSEExpandedPortfolioSelection,
  RSEPortfolioDefinition,
} from "../types";

type ArchetypePortfolioBuildingService = Pick<
  IBuildingService,
  "getArchetypes" | "getArchetypeDetails"
>;

export class RSEPortfolioValidationError extends Error {
  readonly reason: RSEUnavailableReason;

  constructor(message: string, reason: RSEUnavailableReason) {
    super(message);
    this.name = "RSEPortfolioValidationError";
    this.reason = reason;
    Object.setPrototypeOf(this, RSEPortfolioValidationError.prototype);
  }
}

export function createArchetypePortfolioService(
  service: ArchetypePortfolioBuildingService = buildingService,
) {
  return {
    async loadArchetypes(): Promise<RSEArchetypeRef[]> {
      const archetypes = await service.getArchetypes();

      return archetypes.map(toArchetypeRef).sort(compareArchetypeRefs);
    },

    async getArchetypeDetails(ref: RSEArchetypeRef) {
      return service.getArchetypeDetails(ref);
    },

    validatePortfolio(
      definition: RSEPortfolioDefinition,
    ): RSEPortfolioDefinition {
      return validatePortfolio(definition);
    },

    async expandPortfolio(
      definition: RSEPortfolioDefinition,
    ): Promise<RSEExpandedPortfolioSelection[]> {
      const portfolio = validatePortfolio(definition);

      return Promise.all(
        portfolio.selections.map(async (selection) => ({
          ...selection,
          details: await service.getArchetypeDetails(selection.archetype),
        })),
      );
    },
  };
}

export const archetypePortfolioService = createArchetypePortfolioService();

function validatePortfolio(
  definition: RSEPortfolioDefinition,
): RSEPortfolioDefinition {
  if (definition.selections.length === 0) {
    throw new RSEPortfolioValidationError(
      "RSE portfolio must include at least one archetype.",
      RSE_UNAVAILABLE_REASONS.emptyPortfolio,
    );
  }

  const seen = new Set<string>();

  return {
    selections: definition.selections.map((selection) => {
      const archetype = normalizeArchetypeRef(selection.archetype);

      if (!isCompleteArchetypeRef(archetype)) {
        throw new RSEPortfolioValidationError(
          "RSE portfolio archetype references must include country, category, and name.",
          RSE_UNAVAILABLE_REASONS.incompleteArchetypeRef,
        );
      }

      const key = archetypeKey(archetype);
      if (seen.has(key)) {
        throw new RSEPortfolioValidationError(
          "RSE portfolio cannot include the same archetype more than once.",
          RSE_UNAVAILABLE_REASONS.duplicateArchetype,
        );
      }
      seen.add(key);

      if (
        !Number.isFinite(selection.buildingCount) ||
        !Number.isInteger(selection.buildingCount) ||
        selection.buildingCount <= 0
      ) {
        throw new RSEPortfolioValidationError(
          "RSE portfolio building counts must be positive whole numbers.",
          RSE_UNAVAILABLE_REASONS.invalidBuildingCount,
        );
      }

      return {
        archetype,
        buildingCount: selection.buildingCount,
      };
    }),
  };
}

function toArchetypeRef(archetype: ArchetypeInfo): RSEArchetypeRef {
  return {
    country: archetype.country,
    category: archetype.category,
    name: archetype.name,
  };
}

function normalizeArchetypeRef(archetype: RSEArchetypeRef): RSEArchetypeRef {
  return {
    country: archetype.country.trim(),
    category: archetype.category.trim(),
    name: archetype.name.trim(),
  };
}

function isCompleteArchetypeRef(archetype: RSEArchetypeRef): boolean {
  return (
    archetype.country.length > 0 &&
    archetype.category.length > 0 &&
    archetype.name.length > 0
  );
}

function compareArchetypeRefs(
  left: RSEArchetypeRef,
  right: RSEArchetypeRef,
): number {
  return archetypeKey(left).localeCompare(archetypeKey(right));
}

function archetypeKey(archetype: RSEArchetypeRef): string {
  return [archetype.country, archetype.category, archetype.name].join("\u001f");
}
