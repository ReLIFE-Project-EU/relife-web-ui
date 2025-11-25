// Financial Service API Types
// Based on OpenAPI specs from api-specs/20251125-145112/financial.json

// ============================================================================
// NPV (Net Present Value)
// ============================================================================

export interface NPVRequest {
  cash_flows: number[];
  discount_rate: number;
  energy_savings: number;
  initial_investment: number;
  lifetime: number;
}

export interface NPVResponse {
  npv: number;
  input: NPVRequest;
}

// ============================================================================
// II (Initial Investment)
// ============================================================================

export interface IIRequest {
  capex: number;
  interest_rate: number;
  loan_term: number;
  loan_amount: number;
  subsidy: number;
}

export interface IIResponse {
  ii: number;
  input: IIRequest;
}

// ============================================================================
// OPEX (Operational Expenses)
// ============================================================================

export interface OPEXRequest {
  energy_mix: number[];
  energy_prices: number[];
  maintenance_cost: number;
}

export interface OPEXResponse {
  opex: number;
  input: OPEXRequest;
}

// ============================================================================
// ROI (Return on Investment)
// ============================================================================

export interface ROIRequest {
  capex: number;
  interest_rate: number;
  loan_term: number;
  loan_amount: number;
  subsidy: number;
  energy_savings: number;
  energy_mix: number[];
  energy_prices: number[];
  maintenance_cost: number;
  other_outflows: number;
}

export interface ROIResponse {
  roi: number;
  input: ROIRequest;
}

// ============================================================================
// IRR (Internal Rate of Return)
// ============================================================================

export interface IRRRequest {
  capex: number;
  interest_rate: number;
  loan_term: number;
  loan_amount: number;
  subsidy: number;
  energy_savings: number;
  energy_mix: number[];
  energy_prices: number[];
  maintenance_cost: number;
  other_outflows: number;
  project_lifetime: number;
}

export interface IRRResponse {
  irr: number;
  input: IRRRequest;
}
