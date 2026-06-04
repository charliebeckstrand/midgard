import type { FlexAlign, FlexDirection, ResponsiveAlign, ResponsiveDirection } from './variants'

function alignForDirection(dir: FlexDirection): FlexAlign {
	return dir === 'col' || dir === 'col-reverse' ? 'start' : 'center'
}

export function defaultAlignFromDirection(direction: ResponsiveDirection): ResponsiveAlign {
	if (typeof direction === 'string') return alignForDirection(direction)

	const align: Record<string, FlexAlign> = {}

	for (const [bp, dir] of Object.entries(direction)) {
		if (dir !== undefined) align[bp] = alignForDirection(dir)
	}

	return align
}
