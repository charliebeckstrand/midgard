'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/dashboard'
import { gridArea } from './engine/dashboard-layout'
import { useDashboardStore } from './use-dashboard-store'

/** Props for {@link DashboardPlaceholder}. @internal */
export type DashboardPlaceholderProps = {
	/** The gutter in px, which the placeholder insets by half on each side. */
	gap: number
}

/**
 * The landing cell of a dragged tile. It shows where a drop now puts the tile,
 * and it goes away when a drop there changes nothing.
 *
 * @internal
 */
export function DashboardPlaceholder({ gap }: DashboardPlaceholderProps) {
	const cell = useDashboardStore((view) => view.placeholder)

	if (cell === null) return null

	return (
		<div
			data-slot="dashboard-placeholder"
			aria-hidden
			style={{ gridArea: gridArea(cell), margin: gap / 2 }}
			className={cn(k.placeholder)}
		/>
	)
}
