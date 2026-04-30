# D3.2 Web UI Guidance

Source: ReLIFE Deliverable D3.2 "Methodological Frameworks of ReLIFE Services", v0.5, 31/10/2025.

Use this file when work touches the three tools, building data input, service data flow, financial indicators, MCDA, EPC reporting, or compliance.

## Tool Model

| Tool                               | Group | Users                                                         | Primary UI purpose                                                         |
| ---------------------------------- | ----- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Renovation Strategy Explorer (RSE) | 1     | Policymakers, urban planners, researchers, public authorities | Regional/national building stock analysis and strategy development         |
| Portfolio Renovation Advisor (PRA) | 2     | Financial institutions, ESCOs, large-scale building owners    | Portfolio-level renovation assessment, risk, and investment prioritization |
| Home Renovation Assistant (HRA)    | 3     | Homeowners, tenants, small-scale owners                       | Single-building renovation guidance in accessible language                 |

Required service sequence by tool:

| Tool | Required flow                                                                                                          | UI output                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| RSE  | Region/country -> Technical stock/archetypes -> Forecasting simulations -> Financial indicators -> Technical synthesis | Regional projections, energy trends, policy visualizations      |
| PRA  | Portfolio data -> Forecasting per building -> Financial scenarios/risk -> Technical MCDA ranking                       | Comparative analytics, risk profiles, investment prioritization |
| HRA  | Basic building info -> Forecasting packages -> Financial indicators -> Technical ranking -> financing comparison       | Plain-language recommendations and simplified visuals           |

## D3.2 Requirements

| ID   | Requirement                                     | Groups | UI implication                                |
| ---- | ----------------------------------------------- | ------ | --------------------------------------------- |
| UR1  | Single-interface renovation scenario comparison | 2, 3   | Real-time comparison workspace                |
| UR2  | EPC-based reporting                             | All    | Current/projected EPC values                  |
| UR3  | Technical intervention simulation               | 2, 3   | Envelope/HVAC simulation results              |
| UR4  | Cost and energy-savings estimation              | 2, 3   | Built-in actionable calculator                |
| UR5  | Pre-validated renovation scenarios              | 2, 3   | Archetype-based scenario library              |
| UR6  | Funding and incentive directory                 | All    | Centralized funding directory                 |
| UR7  | Interactive financial calculators               | All    | ROI/payback calculators with policy awareness |
| UR8  | Updated funding mechanisms                      | All    | Evolving funding options                      |
| UR9  | Insurance/risk analytics                        | 2      | Risk assessment visualizations                |
| UR10 | Clear technical/financial info                  | 3      | Plain language, examples                      |
| UR11 | Data-driven O&M/well-being                      | 2, 3   | Comfort/well-being insights                   |
| UR12 | Quality-controlled data repository              | All    | Standard formats and validation               |
| UR13 | Energy-monitoring visualization                 | 1      | Graphs, maps, dashboards                      |
| UR14 | Urban/regional/country factors                  | 1      | Regional/national filters                     |
| UR15 | Data-driven policymaking                        | 1      | Accurate data gathering and forecasting       |
| UR16 | Building stock analytics                        | 1      | Large-scale analytics and assessments         |

Technical requirements relevant to the Web UI:

| ID         | Requirement                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| TR1, TR10  | Scalability and fast load times                                                                               |
| TR13, TR14 | CSV/common-format uploads, input validation, quality checks                                                   |
| TR15, TR16 | Job history and unified data storage/retrieval                                                                |
| TR3        | HTTP/OpenAPI interoperability as interchange standard; use service implementation as frontend contract source |
| TR9        | Long-running job support with notifications                                                                   |
| TR6, TR12  | Central identity provider and role-based access                                                               |
| TR4        | Three consistent web tools with API integration                                                               |
| TR17, TR19 | Pre-validated renovation packages/scenario library                                                            |
| TR18       | Exportable reports                                                                                            |
| TR20       | Portfolio input by manual or automated building data entry                                                    |
| TR21       | Dynamic financial results with indicators and funding options                                                 |

## Service Requirements

### Financial

Funding options can be combined:

| Type    | User inputs                                                 |
| ------- | ----------------------------------------------------------- |
| Loan    | Loan amount EUR, term years                                 |
| Subsidy | Subsidy amount EUR                                          |
| On-bill | Loan amount EUR, percentage of energy savings for repayment |

Display indicators:

| Indicator          | Meaning                     | UI note                                  |
| ------------------ | --------------------------- | ---------------------------------------- |
| Initial Investment | Total capital required      | Show with/without funding                |
| OPEX               | Annual operational expenses | Break down by component                  |
| PP                 | Payback Period              | Simple ratio display                     |
| DPP                | Discounted Payback Period   | Mainly professional users                |
| NPV                | Net Present Value           | Mark positive/negative                   |
| IRR                | Internal Rate of Return     | Higher is better                         |
| ROI                | Return on Investment        | Make easy to understand                  |
| ARV                | After Renovation Value      | Estimated post-renovation property value |

Risk display: Monte Carlo worst/typical/best cases, probability distributions/histograms, and 80% confidence intervals for energy prices, inflation, and interest forecasts.

Financial building inputs: country/address, typology, construction year, last major renovation year if applicable, story count, floor area.

### Forecasting

Building input pathways:

1. Reference archetype.
2. Custom building input.
3. Modified archetype.

Key inputs: latitude/longitude; gross area, floors, height, perimeter; U-values, thermal capacity, thermal bridges; heating/cooling systems, setpoints, max power; occupancy/internal gains/air change rates; window g-value/orientation/area.

Outputs: hourly/monthly/annual heating and cooling kWh; kWh/m2/year; peak W/m2; indoor temperature/comfort range; CO2 kgCO2/m2/year; EPC estimate where available.

Climate scenarios: present-day TMY, 2030 projection, 2050 projection.

### Technical

Technical sheets have eight sections: description, application, generic advantages/disadvantages, technical information, embodied carbon, installation data, maintenance data, labor/material cost. Categories: envelope, HVAC, on-site renewables.

MCDA pillars:

| Pillar                                | Criteria                                                          |
| ------------------------------------- | ----------------------------------------------------------------- |
| Energy Efficiency                     | Envelope U-value, window U-value, heating COP/%, cooling SEER     |
| Renewable Energy Integration          | Solar thermal coverage %, on-site RES %, net export kWh/year      |
| Sustainability & Environmental Impact | Embodied carbon kgCO2e/m2, GWP kgCO2e/m2/year                     |
| User Comfort                          | Thermal comfort air temperature %, humidity %                     |
| Financial Viability                   | Initial investment, annual operating cost, IRR, NPV, payback, ARV |

Persona weights:

| Persona                    | 0.333          | 0.267             | 0.200             | 0.133          | 0.067           |
| -------------------------- | -------------- | ----------------- | ----------------- | -------------- | --------------- |
| Environmentally Conscious  | Sustainability | RES Integration   | Energy Efficiency | User Comfort   | Financial       |
| Comfort-Driven             | User Comfort   | Energy Efficiency | Financial         | Sustainability | RES Integration |
| Cost-Optimization Oriented | Financial      | Energy Efficiency | RES Integration   | User Comfort   | Sustainability  |

TOPSIS display: normalized 0-100 criterion scores, relative closeness 0-1, higher closeness means closer to ideal. Custom AHP weights are optional, not mandatory.

RSE building-stock inputs: number/percentage of buildings to renovate per archetype, target horizon 2030/2040/2050, intervention phasing. Outputs: total investment EUR, annual cost savings EUR, annual energy reduction kWh, CO2 before/after, CO2 reduction per building.

## Service Data Flow

Required dependencies:

| From        | To          | Data                                        |
| ----------- | ----------- | ------------------------------------------- |
| User        | Forecasting | Building characteristics, location, systems |
| Forecasting | Financial   | Energy savings, energy mix, EPC rating      |
| Forecasting | Technical   | Performance outputs, comfort metrics        |
| Financial   | Technical   | Financial indicators for MCDA               |
| Technical   | User        | Ranked scenarios and recommendations        |

## Compliance

| Area                    | UI implications                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GDPR/data protection    | Collect only necessary data, justify fields, privacy by design, anonymization/pseudonymization before analysis, clear consent where personal data is processed, retention limits, transparent data sourcing/transformation/validation |
| Access control          | Role-based access, encrypted transfers, audit logging, NDA/confidentiality awareness                                                                                                                                                  |
| Ethical data management | Evaluate data bias/representativeness, publish only aggregated/anonymized results where needed, keep AI/ML outputs traceable and understandable                                                                                       |

## Scope Boundaries

D3.2 does not define frontend framework, component library, endpoint URL structure, CI/CD, test strategy beyond quality expectations, coding standards, database schema, or deployment architecture.

Mandatory D3.2 items: three tools; loan/subsidy/on-bill funding; NPV/IRR/ROI/PP/DPP/ARV; Monte Carlo risk display; three building input pathways; five-pillar MCDA; three predefined personas; RSE building stock analysis; EPC reporting; input validation; RBAC; GDPR mechanisms.

Implied/supported items: responsive design, exports, job history, long-running simulation notifications.

Alignment risks:

| Risk                        | Mitigation                                                                        |
| --------------------------- | --------------------------------------------------------------------------------- |
| Broken service data flow    | Follow the documented dependencies between Forecasting, Financial, and Technical  |
| Wrong MCDA weights          | Use the persona weights in this file exactly                                      |
| Approximate EPC translation | Clearly label where EPC values are estimates or country methodology is incomplete |
| Wrong financial formulas    | Verify against the Financial service/source behavior                              |
| Climate scenario confusion  | Label present/2030/2050 assumptions clearly                                       |
| Missing GDPR safeguards     | Implement the documented compliance requirements                                  |

Detailed D3.2 source sections: user requirements section 2; Financial section 3; Forecasting section 4; Technical section 5; legal section 6; building stock 5.2.3; MCDA 5.2.2; technical sheets 5.2.1.
