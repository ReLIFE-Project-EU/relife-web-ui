// Technical Service API Types
// Aligned with the live MCDA/TOPSIS route mounted by the checked-in service.

export type McdaProfile =
  | "Environment-Oriented"
  | "Comfort-Oriented"
  | "Financially-Oriented";

export interface McdaTechnology {
  name: string;
  envelope_kpi: number;
  window_kpi: number;
  heating_system_kpi: number;
  cooling_system_kpi: number;
  st_coverage_kpi: number;
  onsite_res_kpi: number;
  net_energy_export_kpi: number;
  embodied_carbon_kpi: number;
  gwp_kpi: number;
  thermal_comfort_air_temp_kpi: number;
  thermal_comfort_humidity_kpi: number;
  ii_kpi: number;
  aoc_kpi: number;
  irr_kpi: number;
  npv_kpi: number;
  pp_kpi: number;
  arv_kpi: number;
}

export type McdaKpiKey = keyof Omit<McdaTechnology, "name">;

export type McdaMinsMaxes = Record<McdaKpiKey, [number, number]>;

export interface McdaTopsisRequest {
  profile: McdaProfile;
  mins_maxes: McdaMinsMaxes;
  technologies: McdaTechnology[];
}

export interface McdaTopsisRankingItem {
  name: string;
  closeness: number;
  S_plus: number;
  S_minus: number;
}

export interface McdaTopsisResponse {
  profile: McdaProfile;
  ranking: McdaTopsisRankingItem[];
}
