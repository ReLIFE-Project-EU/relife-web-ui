# ReLIFE Web UI

Terms shared by the Home Renovation Assistant, Portfolio Renovation Advisor and Renovation Strategy Explorer when they estimate a building's energy use and renovation outcomes.

## Buildings

**Archetype**:
A reference building from the Forecasting catalogue, identified by country, category and construction period.
_Avoid_: template, reference building

**Adjusted archetype**:
A copy of an archetype with the user's changes to geometry, insulation or setpoints applied before simulation.
_Avoid_: custom building, modified BUI

**Simulated building**:
The building Forecasting actually ran (an archetype or an adjusted archetype), together with the modeled home it stands for.
_Avoid_: estimation building, archetype geometry

**Modeled home**:
The flat, house or building the results describe; simulated results are scaled to its floor area.
_Avoid_: user building, target building, user area

**Flat share**:
A modeled home that is one flat inside an apartment-block archetype, taking a proportional share of the block's envelope and output.
_Avoid_: flat unit, apartment mode

**Whole building**:
A modeled home that is the entire simulated building, resized to the user's floor area and floors when they differ.
_Avoid_: full building

**Ground floor**:
The part of a building's envelope in contact with the ground, as opposed to its walls, roof and windows; floor insulation targets it.
_Avoid_: slab, ground slab (Forecasting's word, used only in its requests)

**Area scale factor**:
The modeled home's floor area divided by the simulated building's floor area; it scales energy, envelope and PV alike.
_Avoid_: area ratio, scale ratio

## Scenarios

**Baseline**:
The modeled home as it is today, simulated on the same engine as the renovation packages so their savings compare like with like.
_Avoid_: current status, reference (the reference is the unmodified archetype)

**Scenario energy**:
The annual energy of one simulated scenario (baseline or renovation package), scaled to the modeled home: thermal need, delivered energy by carrier, primary energy, PV generation and indoor comfort.
_Avoid_: estimation energy, ECM scaling

## Energy flows

**Thermal need**:
The heat the rooms need added or removed in a year to hold the setpoints, before any equipment.
_Avoid_: energy needs, demand

**System electricity**:
The electricity the heating and cooling systems use in a year, whatever its source.
_Avoid_: delivered electricity, electric load

**PV generation**:
All the electricity the building's panels make in a year.
_Avoid_: PV output, PV production

**PV self-consumption**:
The part of system electricity that the building's own PV covers at the same hour.

**Grid import**:
The part of system electricity that the building buys from the grid.

**Grid export**:
PV generation that the systems do not use at that hour and that goes to the grid; it does not reduce delivered energy.

**Delivered energy**:
The energy the building buys for heating and cooling: natural gas plus grid import.
_Avoid_: delivered electricity (ambiguous)

**Carrier**:
The form in which delivered energy arrives: natural gas or grid electricity. PV self-consumption is not a carrier, because nobody delivers it.

## Money

**Package appraisal**:
The Financial service's verdict on whether a renovation package pays back: NPV, IRR, ROI and payback. The baseline has none, because it is not a package.
_Avoid_: financial results, risk assessment (the Financial endpoint's name)

**Appraised**:
A package appraisal that the Financial service calculated.

**Skipped**:
A package appraisal that was never requested, together with the reason; it has no figures.
_Avoid_: unavailable, not applicable, zero

**Funding**:
How a renovation package's cost is paid: subsidy, loan and the owner's own money.
_Avoid_: financing options

**Electricity equivalent**:
A package's carrier savings in euros, expressed as the grid electricity that would cost the same at the Financial service's reference price.
_Avoid_: annual energy savings (ambiguous)
