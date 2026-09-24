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

export const padding = {
	p: (v: PadStop) => pStops[v],
	px: (v: PadStop) => pxStops[v],
	py: (v: PadStop) => pyStops[v],
	ps: (v: PadStop) => psStops[v],
	pe: (v: PadStop) => peStops[v],
} as const
