# Source Structure Guide

This file documents the `src` layout for faster onboarding and cleaner edits.

## Top-level folders
- `src/pages`: Route-level screens.
- `src/layout`: Shared page shells.
- `src/components`: Reusable UI (grouped by purpose).
- `src/store`: Zustand stores and app state.
- `src/utils`: Shared utility logic.
- `src/data`: Static content/config used by UI.
- `src/hooks`: Custom hooks.
- `src/assets`: Static assets.

## Components grouping
- `src/components/common`
  - Shared cross-feature UI (`DarkModeToggle`, `PageTransition`, `UpgradeRequiredModal`).
- `src/components/navigation`
  - Navigation-specific UI (`PremiumNavbar`).
- `src/components/guards`
  - Route/auth guards (`AuthRequired`, `DashboardGate`, `PublicOnlyRoute`, `RoleRoute`, etc).
- `src/components/landing`
  - Landing page primitives (`LandingUI.jsx`) and sections (`landing/sections/*`).

## Page conventions
- Public pages live in `src/pages`.
- Dashboard pages live in `src/pages/app`.
- Pages compose reusable sections/components and keep business logic in stores/utils.

## Data conventions
- Put large static arrays/objects in `src/data`.
- Keep components focused on rendering and user interactions.

## Plan/feature logic
- Centralize plan definitions in `src/utils/plans.js`.
- Reuse helpers (`getPlan`, `isPaidPlan`) across UI/pages.
