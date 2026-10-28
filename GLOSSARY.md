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

**Area scale factor**:
The modeled home's floor area divided by the simulated building's floor area; it scales energy, envelope and PV alike.
_Avoid_: area ratio, scale ratio
