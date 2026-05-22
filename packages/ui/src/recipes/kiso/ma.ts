/**
 * Ma (間) — interval.
 *
 * The named spacing scale shared by padding, margin, and gap. Each step is a
 * theme token (`--step-{xs..xl}` in `packages/ui/src/theme.css`) projected
 * through static `@utility` rules, so `p-md`, `gap-lg`, `mt-xs`, and every
 * `<direction>-<step>` combo are first-class Tailwind utilities — write them
 * inline. The scale lives outside `--spacing-*` so it doesn't shadow
 * `max-w-sm`, `w-md`, and friends. Most components land on `sm` / `md` /
 * `lg`; the ends cover edge cases (compact chrome, page-level layout).
 *
 * Layer: kiso · Concern: spacing
 */

export const ma = ['xs', 'sm', 'md', 'lg', 'xl'] as const

export type Ma = (typeof ma)[number]
