# API Services

This directory will contain the real API implementations of the services.

When the backend APIs are ready:

1. Create new files here implementing the interfaces defined in `../types.ts`.
   - `BuildingService.ts`
   - `EnergyService.ts`
   - `FinancialService.ts`
   - `RenovationService.ts`
   - `MCDAService.ts`
2. Update `src/features/home-assistant/context/ServiceContext.tsx` to use these implementations when a specific flag (e.g. `VITE_USE_MOCK=false`) is set, or simply replace the default implementations.
