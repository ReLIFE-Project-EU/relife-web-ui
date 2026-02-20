/**
 * HRA Energy Utils - re-exports from shared services
 */
export {
  EPC_THRESHOLDS,
  ENERGY_PRICE_EUR_PER_KWH,
  DEFAULT_FLOOR_AREA,
  getEPCClass,
  estimateAnnualHvacEnergyCost,
  transformColumnarToRowFormat,
  calculateAnnualTotals,
} from "../../../services/energyUtils";
