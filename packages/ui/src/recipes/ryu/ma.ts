/**
 * Ma (間) — Interval.
 *
 * The named spacing scale shared by padding, margin, and gap. Each step is a
 * theme token (`--step-{xs..xl}` in `packages/ui/src/theme.css`) projected
 * through static `@utility` rules, so `p-md`, `gap-lg`, `mt-xs`, and every
 * other `<direction>-<step>` combo are first-class Tailwind utilities. Write
 * them inline — there is no translation layer here. The scale lives outside
 * `--spacing-*` so it doesn't shadow `max-w-sm`, `w-md`, and friends.
 *
 * The scale is calibrated so most components land on `sm`/`md`/`lg` and the
 * ends are reserved for edge cases (compact chrome, page-level layout).
 *
 * Tier: 1 · Concern: spacing
 */

export const ma = ['xs', 'sm', 'md', 'lg', 'xl'] as const
export type Ma = (typeof ma)[number]
