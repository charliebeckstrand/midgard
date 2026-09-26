import type { Ma } from '../../recipes'
import { BREAKPOINTS, type Breakpoint, type Orientation, type Responsive } from '../../types'
import {
	type ResponsiveAlign,
	type ResponsiveGap,
	resolveAlign,
	resolveGap,
} from '../flex/variants'

/** Gap step between the two panes, drawn from the shared `Ma` spacing scale. */
export type SplitGap = Ma

/** First-pane-to-second-pane size ratio: the first pane's share of the two `fr` tracks. */
export type SplitRatio = '1/4' | '1/3' | '1/2' | '2/3' | '3/4'
/** Whether the panes lay out as columns (`horizontal`) or rows (`vertical`). */
export type SplitOrientation = Orientation

/** {@link SplitOrientation} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveSplitOrientation = Responsive<SplitOrientation>
/** {@link SplitRatio} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveSplitRatio = Responsive<SplitRatio>

// Mobile-first (min-width) template maps, spelled out as literals: Tailwind's
// scanner cannot see a class built by interpolation. The tracks were an inline
// `gridTemplate*` style before this, which is why the pair could not go
// responsive — a style attribute carries no breakpoint. `Flex` pays the same
// literal cost for each of its four axes.
const responsiveTemplateMap = {
	initial: {
		horizontal: {
			'1/4': 'grid-cols-[1fr_3fr]',
			'1/3': 'grid-cols-[1fr_2fr]',
			'1/2': 'grid-cols-[1fr_1fr]',
			'2/3': 'grid-cols-[2fr_1fr]',
			'3/4': 'grid-cols-[3fr_1fr]',
		},
		vertical: {
			'1/4': 'grid-rows-[1fr_3fr]',
			'1/3': 'grid-rows-[1fr_2fr]',
			'1/2': 'grid-rows-[1fr_1fr]',
			'2/3': 'grid-rows-[2fr_1fr]',
			'3/4': 'grid-rows-[3fr_1fr]',
		},
	},
	sm: {
		horizontal: {
			'1/4': 'sm:grid-cols-[1fr_3fr]',
			'1/3': 'sm:grid-cols-[1fr_2fr]',
			'1/2': 'sm:grid-cols-[1fr_1fr]',
			'2/3': 'sm:grid-cols-[2fr_1fr]',
			'3/4': 'sm:grid-cols-[3fr_1fr]',
		},
		vertical: {
			'1/4': 'sm:grid-rows-[1fr_3fr]',
			'1/3': 'sm:grid-rows-[1fr_2fr]',
			'1/2': 'sm:grid-rows-[1fr_1fr]',
			'2/3': 'sm:grid-rows-[2fr_1fr]',
			'3/4': 'sm:grid-rows-[3fr_1fr]',
		},
	},
	md: {
		horizontal: {
			'1/4': 'md:grid-cols-[1fr_3fr]',
			'1/3': 'md:grid-cols-[1fr_2fr]',
			'1/2': 'md:grid-cols-[1fr_1fr]',
			'2/3': 'md:grid-cols-[2fr_1fr]',
			'3/4': 'md:grid-cols-[3fr_1fr]',
		},
		vertical: {
			'1/4': 'md:grid-rows-[1fr_3fr]',
			'1/3': 'md:grid-rows-[1fr_2fr]',
			'1/2': 'md:grid-rows-[1fr_1fr]',
			'2/3': 'md:grid-rows-[2fr_1fr]',
			'3/4': 'md:grid-rows-[3fr_1fr]',
		},
	},
	lg: {
		horizontal: {
			'1/4': 'lg:grid-cols-[1fr_3fr]',
			'1/3': 'lg:grid-cols-[1fr_2fr]',
			'1/2': 'lg:grid-cols-[1fr_1fr]',
			'2/3': 'lg:grid-cols-[2fr_1fr]',
			'3/4': 'lg:grid-cols-[3fr_1fr]',
		},
		vertical: {
			'1/4': 'lg:grid-rows-[1fr_3fr]',
			'1/3': 'lg:grid-rows-[1fr_2fr]',
			'1/2': 'lg:grid-rows-[1fr_1fr]',
			'2/3': 'lg:grid-rows-[2fr_1fr]',
			'3/4': 'lg:grid-rows-[3fr_1fr]',
		},
	},
	xl: {
		horizontal: {
			'1/4': 'xl:grid-cols-[1fr_3fr]',
			'1/3': 'xl:grid-cols-[1fr_2fr]',
			'1/2': 'xl:grid-cols-[1fr_1fr]',
			'2/3': 'xl:grid-cols-[2fr_1fr]',
			'3/4': 'xl:grid-cols-[3fr_1fr]',
		},
		vertical: {
			'1/4': 'xl:grid-rows-[1fr_3fr]',
			'1/3': 'xl:grid-rows-[1fr_2fr]',
			'1/2': 'xl:grid-rows-[1fr_1fr]',
			'2/3': 'xl:grid-rows-[2fr_1fr]',
			'3/4': 'xl:grid-rows-[3fr_1fr]',
		},
	},
	'2xl': {
		horizontal: {
			'1/4': '2xl:grid-cols-[1fr_3fr]',
			'1/3': '2xl:grid-cols-[1fr_2fr]',
			'1/2': '2xl:grid-cols-[1fr_1fr]',
			'2/3': '2xl:grid-cols-[2fr_1fr]',
			'3/4': '2xl:grid-cols-[3fr_1fr]',
		},
		vertical: {
			'1/4': '2xl:grid-rows-[1fr_3fr]',
			'1/3': '2xl:grid-rows-[1fr_2fr]',
			'1/2': '2xl:grid-rows-[1fr_1fr]',
			'2/3': '2xl:grid-rows-[2fr_1fr]',
			'3/4': '2xl:grid-rows-[3fr_1fr]',
		},
	},
} satisfies Record<Breakpoint, Record<SplitOrientation, Record<SplitRatio, string>>>

// The axis that a breakpoint turns off. A breakpoint that changes the axis sets
// the template of the new axis only, so the template of the old axis stays in
// force from the smaller breakpoint. The reset clears it. Spelled out as
// literals for the same reason as the map above.
const axisResetMap = {
	sm: { horizontal: 'sm:grid-rows-none', vertical: 'sm:grid-cols-none' },
	md: { horizontal: 'md:grid-rows-none', vertical: 'md:grid-cols-none' },
	lg: { horizontal: 'lg:grid-rows-none', vertical: 'lg:grid-cols-none' },
	xl: { horizontal: 'xl:grid-rows-none', vertical: 'xl:grid-cols-none' },
	'2xl': { horizontal: '2xl:grid-rows-none', vertical: '2xl:grid-cols-none' },
} satisfies Record<Exclude<Breakpoint, 'initial'>, Record<SplitOrientation, string>>

/**
 * The value a responsive prop holds at `bp`: the one named there, else the one
 * carried forward from the last smaller breakpoint that names it.
 *
 * @internal
 */
function valueAt<T>(value: Responsive<T>, bp: Breakpoint, fallback: T): T {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return value

	const named: Partial<Record<Breakpoint, T>> = value

	let held = fallback

	for (const step of BREAKPOINTS) {
		held = named[step] ?? held

		if (step === bp) break
	}

	return held
}

/**
 * Grid-template classes for the `orientation` and `ratio` pair. The two share
 * one class, so a breakpoint named by either emits one: the axis in force
 * there, with the ratio in force there. A breakpoint that changes the axis also
 * resets the template of the old axis.
 *
 * @internal
 */
export function resolveTemplate(
	orientation: ResponsiveSplitOrientation | undefined,
	ratio: ResponsiveSplitRatio | undefined,
): string[] {
	const axis = orientation ?? 'horizontal'

	const steps = ratio ?? '1/2'

	const named = new Set<Breakpoint>(['initial'])

	for (const value of [axis, steps]) {
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			for (const bp of Object.keys(value) as Breakpoint[]) named.add(bp)
		}
	}

	const classes: string[] = []

	let previous: SplitOrientation | undefined

	for (const bp of BREAKPOINTS) {
		if (!named.has(bp)) continue

		const current = valueAt(axis, bp, 'horizontal')

		if (bp !== 'initial' && previous !== undefined && current !== previous) {
			classes.push(axisResetMap[bp][current])
		}

		classes.push(responsiveTemplateMap[bp][current][valueAt(steps, bp, '1/2')])

		previous = current
	}

	return classes
}

/** Flex's align values per breakpoint, or a single value applied at all sizes; the Flex axis. */
export type ResponsiveSplitAlign = ResponsiveAlign
/** {@link SplitGap} per breakpoint, or a single value applied at all sizes; the Flex axis. */
export type ResponsiveSplitGap = ResponsiveGap

export { resolveAlign, resolveGap }
