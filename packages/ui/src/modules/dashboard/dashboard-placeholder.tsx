'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/dashboard'
import { gridArea } from './engine/dashboard-layout'
import { useDashboardStore } from './use-dashboard-store'

/**
 * The landing cell of a dragged tile. It shows where a drop now puts the tile:
 * the start cell when a drop changes nothing. It renders nothing when no drag is
 * live, also during a resize.
 *
 * @internal
 */
export function DashboardPlaceholder() {
	const cell = useDashboardStore((view) => view.placeholder)

	if (cell === null) return null

	return (
		<div
			data-slot="dashboard-placeholder"
			aria-hidden
			// The canvas publishes the gutter, and the placeholder insets half of it on each side, as a tile does.
			style={{ gridArea: gridArea(cell), margin: 'calc(var(--dashboard-gap) / 2)' }}
			className={cn(k.placeholder)}
		/>
	)
}
