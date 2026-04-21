/**
 * Kumi (組) — Assembly.
 *
 * Structural scaffolding for flex and grid containers — direction, alignment,
 * justification, and gap. Gap exposes both a numeric scale and named density
 * steps (xs · sm · md · lg) for composition from density presets.
 *
 * Tier: 1 · Concern: layout scaffolding
 */

export const kumi = {
	gap: {
		0: 'gap-0',
		0.25: 'gap-0.25',
		0.5: 'gap-0.5',
		0.75: 'gap-0.75',
		1: 'gap-1',
		1.25: 'gap-1.25',
		1.5: 'gap-1.5',
		1.75: 'gap-1.75',
		2: 'gap-2',
		2.5: 'gap-2.5',
		3: 'gap-3',
		4: 'gap-4',
		5: 'gap-5',
		6: 'gap-6',
		8: 'gap-8',
		10: 'gap-10',
		12: 'gap-12',
		16: 'gap-16',
		xs: 'gap-0.5',
		sm: 'gap-1',
		md: 'gap-2',
		lg: 'gap-3',
		base: 'gap-4',
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

	/** Cross- and main-axis centering. Combine with `flex` or `inline-flex` at the call site. */
	center: 'items-center justify-center',
} as const
