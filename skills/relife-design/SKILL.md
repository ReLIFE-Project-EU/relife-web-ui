---
name: relife-design
description: Use when making ReLIFE UI, prototype, or visual design decisions that need brand alignment without overriding the local app conventions.
---

# ReLIFE Design

Use this as a lightweight brand and UI sanity check, not as a parallel design system.

## Precedence

For production code, the repository wins:

1. Follow `AGENTS.md`, including D3.2 checks when the work touches the renovation tools, building inputs, financial indicators, MCDA, or EPC reporting.
2. Follow existing `relife-web-ui` patterns in `src/theme.ts`, `src/index.css`, and nearby Mantine components.
3. Use this skill only to keep new UI visually consistent with ReLIFE.

## Practical Rules

- Build production UI with Mantine v8 components and props.
- Use the existing `relife` palette from `src/theme.ts`; do not add a new theme or palette.
- Keep the current system font stack. Do not introduce custom typography.
- Prefer `@tabler/icons-react`; do not use emoji in UI.
- Keep the look restrained: white surfaces, pale gray wells, light borders, modest shadows, and clear spacing.
- Use persona accents consistently: blue for policy/research, teal for finance/ESCO, orange for homeowners.
- Do not add gradients, glassmorphism, decorative blobs, heavy shadows, parallax, or ornamental motion.
- Do not recolor or recreate brand marks. Use the PNG assets in `assets/` when a logo is needed.

## Assets

- `assets/relife-logo.png`
- `assets/life-logo.png`
- `assets/eu-flag.png`

These assets are bundled for direct reuse in prototypes or documentation. In production code, prefer existing public assets if the app already provides them.
