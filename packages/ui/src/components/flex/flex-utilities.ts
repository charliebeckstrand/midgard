import type { FlexAlign, FlexDirection, ResponsiveAlign, ResponsiveDirection } from './variants'

/**
 * Cross-axis default for a single direction: rows center their children;
 * columns stretch theirs to fill the inline axis (`align-items: stretch`). An
 * explicit `align` overrides either.
 *
 * @internal
 */
function alignForDirection(dir: FlexDirection): FlexAlign {
	return dir === 'col' || dir === 'col-reverse' ? 'stretch' : 'center'
}

/**
 * Derives the cross-axis `align` default from `direction`, preserving the
 * responsive shape: a plain direction yields a plain align, an object yields an
 * align per provided breakpoint.
 *
 * @internal
 */
export function defaultAlignFromDirection(direction: ResponsiveDirection): ResponsiveAlign {
	if (typeof direction === 'string') return alignForDirection(direction)

	const align: Record<string, FlexAlign> = {}

	for (const [bp, dir] of Object.entries(direction)) {
		if (dir !== undefined) align[bp] = alignForDirection(dir)
	}

	return align
}
