import { isOwn } from '../events-target'
import type { EventSource } from '../types'
import { observe } from './dom'

/** A layout shift entry, which TypeScript does not type yet. */
type LayoutShift = PerformanceEntry & {
	value?: number
	hadRecentInput?: boolean
	sources?: readonly { node: Node | null }[]
}

/**
 * Whether each node that a layout shift moves is in an element of the tools,
 * such as the rows of the pinned panel as new events come in.
 */
function isOwnShift(shift: LayoutShift): boolean {
	const sources = shift.sources ?? []

	return sources.length > 0 && sources.every(({ node }) => isOwn(node?.parentElement ?? node))
}

/** The paints, and the layout shifts that no input causes and that do not move only the tools. */
export const paint: EventSource = (note) =>
	observe(['paint', 'largest-contentful-paint', 'layout-shift'], (entry) => {
		const shift = entry as LayoutShift

		if (shift.hadRecentInput || isOwnShift(shift)) return

		const value = entry.entryType === 'layout-shift' ? ` ${shift.value?.toFixed(4)}` : ''

		note({ kind: 'paint', text: `${entry.name || entry.entryType}${value}`, time: entry.startTime })
	})
