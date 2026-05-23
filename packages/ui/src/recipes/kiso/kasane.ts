/**
 * Kasane (重ね) — Layered.
 *
 * The library's signature chrome primitive: a four-layer stack on a single
 * element so inset fill, hover ring, focus ring, and validation ring compose
 * without conflict. Spread `kasane.all` for the full effect, or pick layers
 * when a kata only wants a subset.
 */

/**
 * Base ring that the layers are applied on top of. The ring uses solid
 * colours (not translucent like `sen.ringInset`) so adjacent rings in a
 * group can overlap by 1 px without alpha-stacking into a darker line at
 * the join. Radius is not bundled — composers add `kasane.radius(v)` (or
 * `kasane.r(v)` for the outer-only case) so corner rounding can track
 * each component's density step rather than living as a fixed token.
 */
const base = ['ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700']

/** `::before` inset fill — paints the surface inside the 1 px outer ring. */
const inset = ['before:absolute before:inset-px']

/** `::after` overlay used by focus and validation rings. */
const overlay = [
	'after:absolute after:inset-0 after:ring-transparent after:ring-inset after:pointer-events-none',
]

/** Outer ring colour on hover — one shade darker / lighter than resting. */
const hover = [
	'not-has-[>:disabled]:hover:ring-zinc-400',
	'not-has-[>:disabled]:dark:hover:ring-zinc-600',
]

/** `::after` 2 px focus ring — blue when no validation state is active. */
const focus = [
	'focus-within:after:ring-2',
	'data-open:after:ring-2',
	'not-has-[[data-invalid]]:not-has-[[data-valid]]:not-has-[[data-warning]]:focus-within:after:ring-blue-600',
	'not-has-[[data-invalid]]:not-has-[[data-valid]]:not-has-[[data-warning]]:data-open:after:ring-blue-600',
	// Lift the focused element above its attached-group siblings so the join
	// doesn't overpaint the joined-side focus ring with the neighbour's resting
	// ring. `relative` already in `control.frame` provides the stacking context.
	'focus-within:z-10',
	'data-open:z-10',
]

// Per-state validation rings on the outer ring + `::after`. The three blocks
// share the same six-selector shape; literal selectors live here because
// Tailwind's source scanner can't see template-constructed classes.
const valid = [
	'has-[[data-valid]]:ring-green-600',
	'has-[[data-valid]]:hover:ring-green-600',
	'has-[[data-valid]]:focus-within:after:ring-green-600',
	'has-[[data-valid]]:not-focus-within:after:ring-1',
	'has-[[data-valid]]:not-focus-within:after:ring-green-600',
	'has-[[data-valid]]:data-open:after:ring-green-600',
]

const warning = [
	'has-[[data-warning]]:ring-amber-500',
	'has-[[data-warning]]:hover:ring-amber-500',
	'has-[[data-warning]]:focus-within:after:ring-amber-500',
	'has-[[data-warning]]:not-focus-within:after:ring-1',
	'has-[[data-warning]]:not-focus-within:after:ring-amber-500',
	'has-[[data-warning]]:data-open:after:ring-amber-500',
]

const invalid = [
	'has-[[data-invalid]]:ring-red-600',
	'has-[[data-invalid]]:hover:ring-red-600',
	'has-[[data-invalid]]:focus-within:after:ring-red-600',
	'has-[[data-invalid]]:not-focus-within:after:ring-1',
	'has-[[data-invalid]]:not-focus-within:after:ring-red-600',
	'has-[[data-invalid]]:data-open:after:ring-red-600',
]

/** Validation ring on the outer ring + `::after` — red / amber / green per data-* attribute. */
const validation = [...valid, ...warning, ...invalid]

/** Disabled state — dims and locks pointer when the wrapped element is :disabled. */
const disabled = [
	'has-[>:disabled]:opacity-50',
	'has-[>:disabled]:before:shadow-none',
	'has-[>:disabled]:cursor-not-allowed',
	'has-[>:disabled]:**:cursor-not-allowed',
]

// Ring-compensated padding. Each stop subtracts 1 px from the relevant axis
// so the content area lines up with the inset fill rather than the outer
// ring. The literal class strings live here as static maps so Tailwind's
// JIT scanner sees every utility the codebase generates. Variant-prefixed
// cases (`data-*`, `has-*`, `autofill:*`) stay inline at their call sites
// — Tailwind variants must appear in source, not at runtime.

const pStops = {
	'0.75': 'p-[calc(--spacing(0.75)-1px)]',
	'1': 'p-[calc(--spacing(1)-1px)]',
	'1.25': 'p-[calc(--spacing(1.25)-1px)]',
	'1.5': 'p-[calc(--spacing(1.5)-1px)]',
	'2': 'p-[calc(--spacing(2)-1px)]',
	'2.5': 'p-[calc(--spacing(2.5)-1px)]',
	'3': 'p-[calc(--spacing(3)-1px)]',
	'3.5': 'p-[calc(--spacing(3.5)-1px)]',
} as const

const pxStops = {
	'0.75': 'px-[calc(--spacing(0.75)-1px)]',
	'1': 'px-[calc(--spacing(1)-1px)]',
	'1.25': 'px-[calc(--spacing(1.25)-1px)]',
	'1.5': 'px-[calc(--spacing(1.5)-1px)]',
	'2': 'px-[calc(--spacing(2)-1px)]',
	'2.5': 'px-[calc(--spacing(2.5)-1px)]',
	'3': 'px-[calc(--spacing(3)-1px)]',
	'3.5': 'px-[calc(--spacing(3.5)-1px)]',
} as const

const pyStops = {
	'0.75': 'py-[calc(--spacing(0.75)-1px)]',
	'1': 'py-[calc(--spacing(1)-1px)]',
	'1.25': 'py-[calc(--spacing(1.25)-1px)]',
	'1.5': 'py-[calc(--spacing(1.5)-1px)]',
	'2': 'py-[calc(--spacing(2)-1px)]',
	'2.5': 'py-[calc(--spacing(2.5)-1px)]',
	'3': 'py-[calc(--spacing(3)-1px)]',
	'3.5': 'py-[calc(--spacing(3.5)-1px)]',
} as const

const plStops = {
	'0.75': 'pl-[calc(--spacing(0.75)-1px)]',
	'1': 'pl-[calc(--spacing(1)-1px)]',
	'1.25': 'pl-[calc(--spacing(1.25)-1px)]',
	'1.5': 'pl-[calc(--spacing(1.5)-1px)]',
	'2': 'pl-[calc(--spacing(2)-1px)]',
	'2.5': 'pl-[calc(--spacing(2.5)-1px)]',
	'3': 'pl-[calc(--spacing(3)-1px)]',
	'3.5': 'pl-[calc(--spacing(3.5)-1px)]',
} as const

const prStops = {
	'0.75': 'pr-[calc(--spacing(0.75)-1px)]',
	'1': 'pr-[calc(--spacing(1)-1px)]',
	'1.25': 'pr-[calc(--spacing(1.25)-1px)]',
	'1.5': 'pr-[calc(--spacing(1.5)-1px)]',
	'2': 'pr-[calc(--spacing(2)-1px)]',
	'2.5': 'pr-[calc(--spacing(2.5)-1px)]',
	'3': 'pr-[calc(--spacing(3)-1px)]',
	'3.5': 'pr-[calc(--spacing(3.5)-1px)]',
} as const

type PadStop = keyof typeof pStops

const p = (v: PadStop) => pStops[v]

const px = (v: PadStop) => pxStops[v]

const py = (v: PadStop) => pyStops[v]

const pl = (v: PadStop) => plStops[v]

const pr = (v: PadStop) => prStops[v]

// Pixel-perfect corner radii. Each stop pairs an outer-element class
// (`rounded-[--spacing(v)]`) with the matching `::before` inset (`-1px` so
// the inset fill sits inside the 1 px outer ring) and `::after` overlay
// (same radius as outer; the overlay sits at `inset-0`, not `inset-px`).
// Using the `--spacing` scale rather than Tailwind's named radius tokens
// keeps radius and padding proportional — a component with
// `kasane.py('2')` lands on `kasane.r('2')` for a 1:1 padding-to-radius
// ratio at every density step.

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

type RadiusStop = keyof typeof rStops

const r = (v: RadiusStop) => rStops[v]

const ri = (v: RadiusStop) => riStops[v]

const ro = (v: RadiusStop) => roStops[v]

/** Outer + inset + overlay radii, coordinated for the full kasane stack. */
const radius = (v: RadiusStop) => [rStops[v], riStops[v], roStops[v]] as const

export const kasane = {
	base,
	inset,
	overlay,
	hover,
	focus,
	validation,
	disabled,
	p,
	px,
	py,
	pl,
	pr,
	r,
	ri,
	ro,
	radius,
	/** Convenience: every fragment in the correct spread order for a `className`. */
	all: [...base, ...inset, ...overlay, ...hover, ...focus, ...validation, ...disabled],
} as const
