/**
 * Kasane radius: numeric corner-rounding helpers tied to the kasane
 * layer stack. `r(v)` / `ri(v)` / `ro(v)` / `all(v)` map a `--spacing(n)`
 * stop to the matching outer / inset-fill / overlay class, giving a 1:1
 * padding-to-radius ratio at every density step: a component with
 * `py('2')` lands on `r('2')`. `all(v)` returns the coordinated trio,
 * mirroring the `kasane.layers.all` bundle. The named-radius scale
 * (`sm` / `md` / `lg` / ...) lives next door in `rounded.ts`.
 *
 * Layer: kiso · Concern: corner radius
 */

// Each stop pairs an outer-element class (`rounded-[--spacing(v)]`) with the
// matching `::before` inset (`-1px`, inside the 1 px outer ring) and
// `::after` overlay (same radius as outer; the overlay sits at `inset-0`,
// not `inset-px`). The `--spacing` scale keeps radius and padding
// proportional across density steps.

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

export const radius = {
	r: (v: RadiusStop) => rStops[v],
	ri: (v: RadiusStop) => riStops[v],
	ro: (v: RadiusStop) => roStops[v],
	/** Outer + inset + overlay radii, coordinated for the full kasane stack. */
	all: (v: RadiusStop) => [rStops[v], riStops[v], roStops[v]] as const,
} as const
