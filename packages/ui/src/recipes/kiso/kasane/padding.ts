/**
 * Kasane padding: ring-compensated padding helpers. Each stop subtracts
 * 1 px from the relevant axis; the content area lines up with the inset
 * fill rather than the outer ring. The literal class strings live here
 * as static maps; Tailwind's JIT scanner sees every utility the codebase
 * generates. Variant-prefixed cases (`data-*`, `has-*`, `autofill:*`)
 * stay inline at their call sites; Tailwind variants must appear in
 * source, not at runtime.
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

export const padding = {
	p: (v: PadStop) => pStops[v],
	px: (v: PadStop) => pxStops[v],
	py: (v: PadStop) => pyStops[v],
	pl: (v: PadStop) => plStops[v],
	pr: (v: PadStop) => prStops[v],
} as const
