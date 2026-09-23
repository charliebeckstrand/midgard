'use client'

import type { ReactNode } from 'react'
import { CardDescription, CardTitle } from '../../components/card'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dashboard'

/** Props for {@link DashboardTileHeader}. @internal */
export type DashboardTileHeaderProps = {
	/** The id of the title element, which names the tile. */
	titleId: string
	/** The heading of the tile. */
	title?: string
	/** The muted line under the title. */
	description?: ReactNode
	/** The controls at the far end of the row. */
	actions?: ReactNode
	/** The control that clears the selection of the tile, before the actions. */
	clear?: ReactNode
	/** The drag grip in edit mode, or `null`. */
	handle: ReactNode
}

/**
 * The header row of a tile: the drag grip, the title block, and the actions.
 * The grip enters and leaves with edit mode on the same row. The content box
 * therefore keeps its height, and a widget never re-lays out on the switch.
 *
 * @internal
 */
export function DashboardTileHeader({
	titleId,
	title,
	description,
	actions,
	clear,
	handle,
}: DashboardTileHeaderProps) {
	return (
		<div data-slot="card-header" className={cn(k.header)}>
			{handle}

			<div className={cn(k.heading)}>
				{title !== undefined && (
					<CardTitle id={titleId} size="sm" className="truncate">
						{title}
					</CardTitle>
				)}

				{description !== undefined && (
					<CardDescription className="truncate">{description}</CardDescription>
				)}
			</div>

			<div data-slot="dashboard-tile-actions" className={cn(k.actions)}>
				{clear}

				{actions}
			</div>
		</div>
	)
}
