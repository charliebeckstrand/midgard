/**
 * Kasane rounded — named-radius pass-through to Tailwind's named radius
 * scale. Sits beside the numeric `r(v)` / `stack(v)` helpers in `radius`;
 * kept here so kata read like the Tailwind class itself
 * (`rounded.lg` → `rounded-lg`).
 *
 * Layer: kiso · Concern: named corner radius
 */

export const rounded = {
	none: 'rounded-none',
	sm: 'rounded-sm',
	md: 'rounded-md',
	lg: 'rounded-lg',
	xl: 'rounded-xl',
	full: 'rounded-full',
} as const
