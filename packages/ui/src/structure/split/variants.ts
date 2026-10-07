import {
	atBreakpoint,
	BREAKPOINTS,
	type Breakpoint,
	type Orientation,
	type Responsive,
} from '../../types'
import {
	type ResponsiveAlign,
	type ResponsiveGap,
	resolveAlign,
	resolveGap,
} from '../flex/variants'

/** First-pane-to-second-pane size ratio: the first pane's share of the two `fr` tracks. */
export type SplitRatio = '1/4' | '1/3' | '1/2' | '2/3' | '3/4'
/** Whether the panes lay out as columns (`horizontal`) or rows (`vertical`). */
export type SplitOrientation = Orientation

/** {@link SplitOrientation} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveSplitOrientation = Responsive<SplitOrientation>
/** {@link SplitRatio} per breakpoint, or a single value applied at all sizes. */
export type ResponsiveSplitRatio = Responsive<SplitRatio>

// The grid template of each axis and ratio. A breakpoint puts its prefix on
// the class (`atBreakpoint`). The tracks were an inline `gridTemplate*` style
// before this, and a style attribute has no breakpoint.
const templateMap = {
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
} satisfies Record<SplitOrientation, Record<SplitRatio, string>>

// The axis that a breakpoint turns off. A breakpoint that changes the axis sets
// the template of the new axis only, so the template of the old axis stays in
// force from the smaller breakpoint. The reset clears it.
const axisResetMap = {
	horizontal: 'grid-rows-none',
	vertical: 'grid-cols-none',
} satisfies Record<SplitOrientation, string>

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
			classes.push(atBreakpoint(axisResetMap[current], bp))
		}

		classes.push(atBreakpoint(templateMap[current][valueAt(steps, bp, '1/2')], bp))

		previous = current
	}

	return classes
}

/** Flex's align values per breakpoint, or a single value applied at all sizes; the Flex axis. */
export type ResponsiveSplitAlign = ResponsiveAlign
/** The `Ma` gap step between the two panes per breakpoint, or a single value applied at all sizes; the Flex axis. */
export type ResponsiveSplitGap = ResponsiveGap

export { resolveAlign, resolveGap }
