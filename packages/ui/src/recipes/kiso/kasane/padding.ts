/**
 * Kasane padding: ring-compensated padding helpers. Each stop subtracts
 * 1 px from the relevant axis; the content area lines up with the inset
 * fill rather than the outer ring. The literal class strings live here
 * as static maps; Tailwind's JIT scanner sees every utility the codebase
 * generates. Variant-prefixed cases (`data-*`, `has-*`, `autofill:*`)
 * stay inline at their call sites; Tailwind variants must appear in
 * source, not at runtime.
 *
 * The single-side stops are logical: `ps` pads the inline start and `pe`
 * the inline end, so they mirror in a right-to-left layout.
 *
 * Layer: kiso · Concern: ring-compensated padding
 */

import { type DensityStep, densitySteps } from '../sun'

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

const psStops = {
	'0.75': 'ps-[calc(--spacing(0.75)-1px)]',
	'1': 'ps-[calc(--spacing(1)-1px)]',
	'1.25': 'ps-[calc(--spacing(1.25)-1px)]',
	'1.5': 'ps-[calc(--spacing(1.5)-1px)]',
	'2': 'ps-[calc(--spacing(2)-1px)]',
	'2.5': 'ps-[calc(--spacing(2.5)-1px)]',
	'3': 'ps-[calc(--spacing(3)-1px)]',
	'3.5': 'ps-[calc(--spacing(3.5)-1px)]',
} as const

const peStops = {
	'0.75': 'pe-[calc(--spacing(0.75)-1px)]',
	'1': 'pe-[calc(--spacing(1)-1px)]',
	'1.25': 'pe-[calc(--spacing(1.25)-1px)]',
	'1.5': 'pe-[calc(--spacing(1.5)-1px)]',
	'2': 'pe-[calc(--spacing(2)-1px)]',
	'2.5': 'pe-[calc(--spacing(2.5)-1px)]',
	'3': 'pe-[calc(--spacing(3)-1px)]',
	'3.5': 'pe-[calc(--spacing(3.5)-1px)]',
} as const

type PadStop = keyof typeof pStops

/**
 * The `px` stops under each `density-*` variant of `ui/tailwind.css`. Tailwind
 * must find a variant in source, so each literal carries its prefix here.
 * {@link padding.pxRamp} reads this map.
 */
const pxDensityStops = {
	xs: {
		'0.75': 'density-xs:px-[calc(--spacing(0.75)-1px)]',
		'1': 'density-xs:px-[calc(--spacing(1)-1px)]',
		'1.25': 'density-xs:px-[calc(--spacing(1.25)-1px)]',
		'1.5': 'density-xs:px-[calc(--spacing(1.5)-1px)]',
		'2': 'density-xs:px-[calc(--spacing(2)-1px)]',
		'2.5': 'density-xs:px-[calc(--spacing(2.5)-1px)]',
		'3': 'density-xs:px-[calc(--spacing(3)-1px)]',
		'3.5': 'density-xs:px-[calc(--spacing(3.5)-1px)]',
	},
	sm: {
		'0.75': 'density-sm:px-[calc(--spacing(0.75)-1px)]',
		'1': 'density-sm:px-[calc(--spacing(1)-1px)]',
		'1.25': 'density-sm:px-[calc(--spacing(1.25)-1px)]',
		'1.5': 'density-sm:px-[calc(--spacing(1.5)-1px)]',
		'2': 'density-sm:px-[calc(--spacing(2)-1px)]',
		'2.5': 'density-sm:px-[calc(--spacing(2.5)-1px)]',
		'3': 'density-sm:px-[calc(--spacing(3)-1px)]',
		'3.5': 'density-sm:px-[calc(--spacing(3.5)-1px)]',
	},
	md: {
		'0.75': 'density-md:px-[calc(--spacing(0.75)-1px)]',
		'1': 'density-md:px-[calc(--spacing(1)-1px)]',
		'1.25': 'density-md:px-[calc(--spacing(1.25)-1px)]',
		'1.5': 'density-md:px-[calc(--spacing(1.5)-1px)]',
		'2': 'density-md:px-[calc(--spacing(2)-1px)]',
		'2.5': 'density-md:px-[calc(--spacing(2.5)-1px)]',
		'3': 'density-md:px-[calc(--spacing(3)-1px)]',
		'3.5': 'density-md:px-[calc(--spacing(3.5)-1px)]',
	},
	lg: {
		'0.75': 'density-lg:px-[calc(--spacing(0.75)-1px)]',
		'1': 'density-lg:px-[calc(--spacing(1)-1px)]',
		'1.25': 'density-lg:px-[calc(--spacing(1.25)-1px)]',
		'1.5': 'density-lg:px-[calc(--spacing(1.5)-1px)]',
		'2': 'density-lg:px-[calc(--spacing(2)-1px)]',
		'2.5': 'density-lg:px-[calc(--spacing(2.5)-1px)]',
		'3': 'density-lg:px-[calc(--spacing(3)-1px)]',
		'3.5': 'density-lg:px-[calc(--spacing(3.5)-1px)]',
	},
	xl: {
		'0.75': 'density-xl:px-[calc(--spacing(0.75)-1px)]',
		'1': 'density-xl:px-[calc(--spacing(1)-1px)]',
		'1.25': 'density-xl:px-[calc(--spacing(1.25)-1px)]',
		'1.5': 'density-xl:px-[calc(--spacing(1.5)-1px)]',
		'2': 'density-xl:px-[calc(--spacing(2)-1px)]',
		'2.5': 'density-xl:px-[calc(--spacing(2.5)-1px)]',
		'3': 'density-xl:px-[calc(--spacing(3)-1px)]',
		'3.5': 'density-xl:px-[calc(--spacing(3.5)-1px)]',
	},
} as const satisfies Record<DensityStep, Record<PadStop, string>>

export const padding = {
	p: (v: PadStop) => pStops[v],
	px: (v: PadStop) => pxStops[v],
	py: (v: PadStop) => pyStops[v],
	ps: (v: PadStop) => psStops[v],
	pe: (v: PadStop) => peStops[v],
	/**
	 * The `px` of each density step: one `density-<step>:` class for each key
	 * of `ramp`. The element takes the stop of its nearest density scope.
	 */
	pxRamp: (ramp: Partial<Record<DensityStep, PadStop>>) =>
		densitySteps.flatMap((step) => {
			const stop = ramp[step]

			return stop === undefined ? [] : [pxDensityStops[step][stop]]
		}),
} as const
