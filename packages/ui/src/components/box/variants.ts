import type { Ma } from '../../recipes'
import { k } from '../../recipes/kata/box'
import { type Breakpoint, type Responsive, resolveResponsive } from '../../types'

/** Spacing-scale step for {@link Box} padding props. */
export type BoxPadding = Ma

/** {@link BoxPadding} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveBoxPadding = Responsive<BoxPadding>

/** Background surface token for {@link Box}. */
export type BoxBg = keyof typeof k.bg

/** Outline weight for {@link Box}; `true` selects the default token. */
export type BoxOutline = boolean | keyof typeof k.outline

/** Border-radius token for {@link Box}. */
export type BoxRadius = keyof typeof k.radius

// Mobile-first (min-width) padding maps spelled out as literals, the way
// `Flex` spells its own four axes: Tailwind's scanner cannot see a class built
// by interpolation. The `initial` row reuses the base map, and every
// breakpoint row is written out, so `md:px-3` and `lg:py-6` exist verbatim in
// source.
const responsivePaddingMap = {
	initial: k.padding,
	sm: {
		0: 'sm:p-0',
		xs: 'sm:p-1',
		sm: 'sm:p-2',
		md: 'sm:p-3',
		lg: 'sm:p-4',
		xl: 'sm:p-6',
	},
	md: {
		0: 'md:p-0',
		xs: 'md:p-1',
		sm: 'md:p-2',
		md: 'md:p-3',
		lg: 'md:p-4',
		xl: 'md:p-6',
	},
	lg: {
		0: 'lg:p-0',
		xs: 'lg:p-1',
		sm: 'lg:p-2',
		md: 'lg:p-3',
		lg: 'lg:p-4',
		xl: 'lg:p-6',
	},
	xl: {
		0: 'xl:p-0',
		xs: 'xl:p-1',
		sm: 'xl:p-2',
		md: 'xl:p-3',
		lg: 'xl:p-4',
		xl: 'xl:p-6',
	},
	'2xl': {
		0: '2xl:p-0',
		xs: '2xl:p-1',
		sm: '2xl:p-2',
		md: '2xl:p-3',
		lg: '2xl:p-4',
		xl: '2xl:p-6',
	},
} satisfies Record<Breakpoint, Record<BoxPadding, string>>

const responsivePxMap = {
	initial: k.px,
	sm: {
		0: 'sm:px-0',
		xs: 'sm:px-1',
		sm: 'sm:px-2',
		md: 'sm:px-3',
		lg: 'sm:px-4',
		xl: 'sm:px-6',
	},
	md: {
		0: 'md:px-0',
		xs: 'md:px-1',
		sm: 'md:px-2',
		md: 'md:px-3',
		lg: 'md:px-4',
		xl: 'md:px-6',
	},
	lg: {
		0: 'lg:px-0',
		xs: 'lg:px-1',
		sm: 'lg:px-2',
		md: 'lg:px-3',
		lg: 'lg:px-4',
		xl: 'lg:px-6',
	},
	xl: {
		0: 'xl:px-0',
		xs: 'xl:px-1',
		sm: 'xl:px-2',
		md: 'xl:px-3',
		lg: 'xl:px-4',
		xl: 'xl:px-6',
	},
	'2xl': {
		0: '2xl:px-0',
		xs: '2xl:px-1',
		sm: '2xl:px-2',
		md: '2xl:px-3',
		lg: '2xl:px-4',
		xl: '2xl:px-6',
	},
} satisfies Record<Breakpoint, Record<BoxPadding, string>>

const responsivePyMap = {
	initial: k.py,
	sm: {
		0: 'sm:py-0',
		xs: 'sm:py-1',
		sm: 'sm:py-2',
		md: 'sm:py-3',
		lg: 'sm:py-4',
		xl: 'sm:py-6',
	},
	md: {
		0: 'md:py-0',
		xs: 'md:py-1',
		sm: 'md:py-2',
		md: 'md:py-3',
		lg: 'md:py-4',
		xl: 'md:py-6',
	},
	lg: {
		0: 'lg:py-0',
		xs: 'lg:py-1',
		sm: 'lg:py-2',
		md: 'lg:py-3',
		lg: 'lg:py-4',
		xl: 'lg:py-6',
	},
	xl: {
		0: 'xl:py-0',
		xs: 'xl:py-1',
		sm: 'xl:py-2',
		md: 'xl:py-3',
		lg: 'xl:py-4',
		xl: 'xl:py-6',
	},
	'2xl': {
		0: '2xl:py-0',
		xs: '2xl:py-1',
		sm: '2xl:py-2',
		md: '2xl:py-3',
		lg: '2xl:py-4',
		xl: '2xl:py-6',
	},
} satisfies Record<Breakpoint, Record<BoxPadding, string>>

/** The all-sides padding classes for a responsive `p`. @internal */
export function resolvePadding(value: ResponsiveBoxPadding | undefined): string[] {
	return resolveResponsive(value, (v, bp) => responsivePaddingMap[bp ?? 'initial'][v])
}

/** The horizontal padding classes for a responsive `px`. @internal */
export function resolvePx(value: ResponsiveBoxPadding | undefined): string[] {
	return resolveResponsive(value, (v, bp) => responsivePxMap[bp ?? 'initial'][v])
}

/** The vertical padding classes for a responsive `py`. @internal */
export function resolvePy(value: ResponsiveBoxPadding | undefined): string[] {
	return resolveResponsive(value, (v, bp) => responsivePyMap[bp ?? 'initial'][v])
}
