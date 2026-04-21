/**
 * Ma (間) — Interval.
 *
 * Padding and margin tokens — the breathing room of an element. Numeric keys
 * give a raw Tailwind spacing scale; named keys (xs · sm · md · lg · xl) map
 * to density steps shared across components.
 *
 * Tier: 1 · Concern: spacing
 */

export const ma = {
	p: {
		0: 'p-0',
		1: 'p-1',
		2: 'p-2',
		3: 'p-3',
		4: 'p-4',
		5: 'p-5',
		6: 'p-6',
		8: 'p-8',
		10: 'p-10',
		12: 'p-12',
		16: 'p-16',
	},

	px: {
		0: 'px-0',
		1: 'px-1',
		2: 'px-2',
		3: 'px-3',
		4: 'px-4',
		5: 'px-5',
		6: 'px-6',
		8: 'px-8',
		10: 'px-10',
		12: 'px-12',
		16: 'px-16',
		xs: 'px-0.5',
		sm: 'px-1',
		md: 'px-2',
		lg: 'px-3',
		xl: 'px-4',
	},

	py: {
		0: 'py-0',
		1: 'py-1',
		2: 'py-2',
		3: 'py-3',
		4: 'py-4',
		5: 'py-5',
		6: 'py-6',
		8: 'py-8',
		10: 'py-10',
		12: 'py-12',
		16: 'py-16',
		xs: 'py-0.5',
		sm: 'py-1',
		md: 'py-2',
		lg: 'py-3',
		xl: 'py-4',
	},

	pt: { xs: 'pt-0.5', sm: 'pt-1', md: 'pt-2', lg: 'pt-3', xl: 'pt-4' },
	pr: { xs: 'pr-0.5', sm: 'pr-1', md: 'pr-2', lg: 'pr-3', xl: 'pr-4' },
	pb: { xs: 'pb-0.5', sm: 'pb-1', md: 'pb-2', lg: 'pb-3', xl: 'pb-4' },
	pl: { xs: 'pl-0.5', sm: 'pl-1', md: 'pl-2', lg: 'pl-3', xl: 'pl-4' },

	m: {
		0: 'm-0',
		1: 'm-1',
		2: 'm-2',
		3: 'm-3',
		4: 'm-4',
		5: 'm-5',
		6: 'm-6',
		8: 'm-8',
		10: 'm-10',
		12: 'm-12',
		16: 'm-16',
		auto: 'm-auto',
	},

	mx: {
		0: 'mx-0',
		1: 'mx-1',
		2: 'mx-2',
		3: 'mx-3',
		4: 'mx-4',
		5: 'mx-5',
		6: 'mx-6',
		8: 'mx-8',
		10: 'mx-10',
		12: 'mx-12',
		16: 'mx-16',
		auto: 'mx-auto',
	},

	my: {
		0: 'my-0',
		1: 'my-1',
		2: 'my-2',
		3: 'my-3',
		4: 'my-4',
		5: 'my-5',
		6: 'my-6',
		8: 'my-8',
		10: 'my-10',
		12: 'my-12',
		16: 'my-16',
		auto: 'my-auto',
	},
} as const

export type Padding = keyof typeof ma.p
export type Margin = keyof typeof ma.m

export const paddingMap = ma.p
export const pxMap = ma.px
export const pyMap = ma.py
export const marginMap = ma.m
export const mxMap = ma.mx
export const myMap = ma.my
