/**
 * Kumi (組) — Assembly.
 *
 * Structural scaffolding for flex and grid containers — gap, direction, alignment, width.
 *
 * Tier: 1 · Concern: layout scaffolding
 */

export const kumi = {
	gap: {
		0: 'gap-0',
		1: 'gap-1',
		2: 'gap-2',
		3: 'gap-3',
		4: 'gap-4',
		5: 'gap-5',
		6: 'gap-6',
		8: 'gap-8',
		10: 'gap-10',
		12: 'gap-12',
		16: 'gap-16',
	},

	direction: {
		row: 'flex-row',
		col: 'flex-col',
		'row-reverse': 'flex-row-reverse',
		'col-reverse': 'flex-col-reverse',
	},

	align: {
		start: 'items-start',
		center: 'items-center',
		end: 'items-end',
		stretch: 'items-stretch',
		baseline: 'items-baseline',
	},

	justify: {
		start: 'justify-start',
		center: 'justify-center',
		end: 'justify-end',
		between: 'justify-between',
		around: 'justify-around',
		evenly: 'justify-evenly',
	},
} as const
