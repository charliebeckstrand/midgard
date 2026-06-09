import type { FlexAlign, FlexDirection, ResponsiveAlign, ResponsiveDirection } from './variants'

// Per-orientation cross-axis default: rows center their children (so items of
// unequal height sit on a shared centre line) while columns stretch theirs to
// fill the inline axis — the natural `align-items: stretch` that lets stacked
// blocks span full width. Either is overridden by an explicit `align`.
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
