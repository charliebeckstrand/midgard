/**
 * Sun (寸) — size step keys.
 *
 * The named density steps shared by interactive components (`sm` / `md` /
 * `lg`). Used as the `<Density>` prop type and as a key into per-step lookup
 * tables (icon, padding, etc.).
 *
 * Layer: ryū · Concern: size
 */

export const steps = ['sm', 'md', 'lg'] as const

export type Step = (typeof steps)[number]
