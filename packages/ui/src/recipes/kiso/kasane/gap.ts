/**
 * Kasane gap — gap helpers. Gap is not ring-compensated (unlike padding,
 * it doesn't intersect the outer ring), so the helpers pass through to
 * Tailwind's native `gap-v` / `gap-x-v` / `gap-y-v` without subtracting
 * 1 px. The design rule applied across density-keyed kata is
 * `gap = py / 2` (rounded to the spacing scale).
 *
 * Layer: kiso · Concern: gap
 */

const gStops = {
	'0.25': 'gap-0.25',
	'0.5': 'gap-0.5',
	'0.75': 'gap-0.75',
	'1': 'gap-1',
	'1.25': 'gap-1.25',
	'1.5': 'gap-1.5',
	'2': 'gap-2',
	'2.5': 'gap-2.5',
	'3': 'gap-3',
} as const

const gxStops = {
	'0.25': 'gap-x-0.25',
	'0.5': 'gap-x-0.5',
	'0.75': 'gap-x-0.75',
	'1': 'gap-x-1',
	'1.25': 'gap-x-1.25',
	'1.5': 'gap-x-1.5',
	'2': 'gap-x-2',
	'2.5': 'gap-x-2.5',
	'3': 'gap-x-3',
} as const

const gyStops = {
	'0.25': 'gap-y-0.25',
	'0.5': 'gap-y-0.5',
	'0.75': 'gap-y-0.75',
	'1': 'gap-y-1',
	'1.25': 'gap-y-1.25',
	'1.5': 'gap-y-1.5',
	'2': 'gap-y-2',
	'2.5': 'gap-y-2.5',
	'3': 'gap-y-3',
} as const

type GapStop = keyof typeof gStops

export const gap = {
	g: (v: GapStop) => gStops[v],
	gx: (v: GapStop) => gxStops[v],
	gy: (v: GapStop) => gyStops[v],
} as const
