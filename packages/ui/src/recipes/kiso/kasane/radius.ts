/**
 * Kasane radius — corner rounding helpers.
 *
 * Two flavours sit here. The numeric `r(v)` / `ri(v)` / `ro(v)` / `stack(v)`
 * helpers map a `--spacing(n)` stop to the matching outer / inset-fill /
 * overlay class so corner rounding stays proportional to the kasane layer
 * stack — a component with `py('2')` lands on `r('2')` for a 1:1
 * padding-to-radius ratio at every density step. `stack(v)` returns all
 * three. The named `rounded` map is a pass-through to Tailwind's named
 * radius scale (`sm` / `md` / `lg` / `full`) for the kata and katakana
 * that pick a coarse named radius.
 *
 * Layer: kiso · Concern: corner radius
 */

// Pixel-perfect corner radii. Each stop pairs an outer-element class
// (`rounded-[--spacing(v)]`) with the matching `::before` inset (`-1px` so
// the inset fill sits inside the 1 px outer ring) and `::after` overlay
// (same radius as outer; the overlay sits at `inset-0`, not `inset-px`).
// Using the `--spacing` scale rather than Tailwind's named radius tokens
// keeps radius and padding proportional.

const rStops = {
	'0.5': 'rounded-[--spacing(0.5)]',
	'0.75': 'rounded-[--spacing(0.75)]',
	'1': 'rounded-[--spacing(1)]',
	'1.25': 'rounded-[--spacing(1.25)]',
	'1.5': 'rounded-[--spacing(1.5)]',
	'2': 'rounded-[--spacing(2)]',
	'2.5': 'rounded-[--spacing(2.5)]',
	'3': 'rounded-[--spacing(3)]',
} as const

const riStops = {
	'0.5': 'before:rounded-[calc(--spacing(0.5)-1px)]',
	'0.75': 'before:rounded-[calc(--spacing(0.75)-1px)]',
	'1': 'before:rounded-[calc(--spacing(1)-1px)]',
	'1.25': 'before:rounded-[calc(--spacing(1.25)-1px)]',
	'1.5': 'before:rounded-[calc(--spacing(1.5)-1px)]',
	'2': 'before:rounded-[calc(--spacing(2)-1px)]',
	'2.5': 'before:rounded-[calc(--spacing(2.5)-1px)]',
	'3': 'before:rounded-[calc(--spacing(3)-1px)]',
} as const

const roStops = {
	'0.5': 'after:rounded-[--spacing(0.5)]',
	'0.75': 'after:rounded-[--spacing(0.75)]',
	'1': 'after:rounded-[--spacing(1)]',
	'1.25': 'after:rounded-[--spacing(1.25)]',
	'1.5': 'after:rounded-[--spacing(1.5)]',
	'2': 'after:rounded-[--spacing(2)]',
	'2.5': 'after:rounded-[--spacing(2.5)]',
	'3': 'after:rounded-[--spacing(3)]',
} as const

export type RadiusStop = keyof typeof rStops

export const r = (v: RadiusStop) => rStops[v]

export const ri = (v: RadiusStop) => riStops[v]

export const ro = (v: RadiusStop) => roStops[v]

/** Outer + inset + overlay radii, coordinated for the full kasane stack. */
export const stack = (v: RadiusStop) => [rStops[v], riStops[v], roStops[v]] as const

/**
 * Named-radius aliases — pass-through to Tailwind's named radius scale.
 * Distinct from the numeric `r(v)` / `stack(v)` helpers above; the named
 * scale is re-exported from `kasane.rounded` so kata read like the
 * Tailwind class (`rounded.lg` → `rounded-lg`).
 */
export const rounded = {
	sm: 'rounded-sm',
	md: 'rounded-md',
	lg: 'rounded-lg',
	full: 'rounded-full',
} as const
