import {
	atBreakpoint,
	BREAKPOINTS,
	type Breakpoint,
	type Orientation,
	type Responsive,
	valueAt,
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
// before this, and a style attribute has no breakpoint. Each value also clears
// the template of the other axis, so each value writes both properties, and a
// breakpoint that changes the axis replaces the template of the old axis.
const templateClasses = {
	horizontal: {
		'1/4': 'grid-cols-[1fr_3fr] grid-rows-none',
		'1/3': 'grid-cols-[1fr_2fr] grid-rows-none',
		'1/2': 'grid-cols-[1fr_1fr] grid-rows-none',
		'2/3': 'grid-cols-[2fr_1fr] grid-rows-none',
		'3/4': 'grid-cols-[3fr_1fr] grid-rows-none',
	},
	vertical: {
		'1/4': 'grid-rows-[1fr_3fr] grid-cols-none',
		'1/3': 'grid-rows-[1fr_2fr] grid-cols-none',
		'1/2': 'grid-rows-[1fr_1fr] grid-cols-none',
		'2/3': 'grid-rows-[2fr_1fr] grid-cols-none',
		'3/4': 'grid-rows-[3fr_1fr] grid-cols-none',
	},
} satisfies Record<SplitOrientation, Record<SplitRatio, string>>

/**
 * Grid-template classes for the `orientation` and `ratio` pair. The two share
 * one class, so a breakpoint named by either emits one: the axis in force
 * there, with the ratio in force there.
 *
 * @internal
 */
export function resolveTemplate(
	orientation: ResponsiveSplitOrientation | undefined,
	ratio: ResponsiveSplitRatio | undefined,
): string[] {
	const axis = orientation ?? 'horizontal'

	const ratios = ratio ?? '1/2'

	const named = new Set<Breakpoint>(['initial'])

	for (const value of [axis, ratios]) {
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			for (const bp of Object.keys(value) as Breakpoint[]) named.add(bp)
		}
	}

	return BREAKPOINTS.filter((bp) => named.has(bp)).map((bp) =>
		atBreakpoint(templateClasses[valueAt(axis, bp, 'horizontal')][valueAt(ratios, bp, '1/2')], bp),
	)
}

/** Flex's align values per breakpoint, or a single value applied at all sizes; the Flex axis. */
export type ResponsiveSplitAlign = ResponsiveAlign
/** The `Ma` gap step between the two panes per breakpoint, or a single value applied at all sizes; the Flex axis. */
export type ResponsiveSplitGap = ResponsiveGap

export { resolveAlign, resolveGap }
