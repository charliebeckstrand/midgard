import type { FlexAlign, FlexDirection, ResponsiveAlign, ResponsiveDirection } from './variants'

// Per-orientation cross-axis default: rows center their children; columns
// stretch theirs to fill the inline axis (`align-items: stretch`). An
// explicit `align` overrides either.
function alignForDirection(dir: FlexDirection): FlexAlign {
	return dir === 'col' || dir === 'col-reverse' ? 'stretch' : 'center'
}

export function defaultAlignFromDirection(direction: ResponsiveDirection): ResponsiveAlign {
	if (typeof direction === 'string') return alignForDirection(direction)

	const align: Record<string, FlexAlign> = {}

	for (const [bp, dir] of Object.entries(direction)) {
		if (dir !== undefined) align[bp] = alignForDirection(dir)
	}

	return align
}
