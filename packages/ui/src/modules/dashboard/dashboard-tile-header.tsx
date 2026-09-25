'use client'

import type { ReactNode } from 'react'
import { CardDescription, CardTitle } from '../../components/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { useTruncation } from '../../hooks/use-truncation'
import { k } from '../../recipes/kata/dashboard'
import { DashboardTileGuard } from './dashboard-tile-boundary'

/** Props for {@link DashboardTileTitle}. @internal */
type DashboardTileTitleProps = {
	/** The id of the title element, which names the tile. */
	id: string
	/** The heading of the tile. */
	title: string
	/** Edit mode is on, so the tooltip stays closed. */
	editing: boolean
}

/**
 * The title of a tile, clipped to one line. When the title truncates, a hover
 * tooltip shows the full text. This is the reveal of the chart header and the
 * grid header. The veil of a spark tile is narrow, so its title truncates first.
 *
 * @remarks In edit mode the tooltip stays closed. The title is then a part of
 * the drag surface, and the grab cursor and the drag own the pointer.
 * @internal
 */
function DashboardTileTitle({ id, title, editing }: DashboardTileTitleProps) {
	const [ref, truncated] = useTruncation<HTMLHeadingElement>()

	return (
		<Tooltip disabled={!truncated || editing}>
			<TooltipTrigger>
				{/* The trigger gives its own slot to a child with no slot, so the title
				    states its slot. `block` wins over the `inline-flex` of the trigger,
				    because an ellipsis paints only on a block box. */}
				<CardTitle ref={ref} id={id} size="sm" data-slot="card-title" className="block truncate">
					{title}
				</CardTitle>
			</TooltipTrigger>

			<TooltipContent>{title}</TooltipContent>
		</Tooltip>
	)
}

/** Props for {@link DashboardTileHeader}. @internal */
export type DashboardTileHeaderProps = {
	/** The name of the tile. */
	label: string
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
	/** The standard controls of the tile, after the actions. */
	controls?: ReactNode
	/** Edit mode is on, so the title shows no tooltip. */
	editing: boolean
	/** Receives each error that a guard of the row catches. */
	onError: (error: unknown) => void
}

/**
 * The header row of a tile: the drag grip, the title block, the actions, and
 * the standard controls.
 * The grip enters and leaves with edit mode on the same row. The content box
 * therefore keeps its height, and a widget never re-lays out on the switch.
 *
 * The row is outside the boundaries of the content box. The description and the
 * actions of the app therefore each get a guard. A throw in one does not reach the board.
 *
 * @internal
 */
export function DashboardTileHeader({
	label,
	titleId,
	title,
	description,
	actions,
	clear,
	handle,
	controls,
	editing,
	onError,
}: DashboardTileHeaderProps) {
	return (
		<div data-slot="card-header" className={cn(k.header)}>
			{handle}

			<div className={cn(k.heading)}>
				{title !== undefined && <DashboardTileTitle id={titleId} title={title} editing={editing} />}

				{description !== undefined && (
					<DashboardTileGuard label={label} onError={onError}>
						<CardDescription className="truncate">{description}</CardDescription>
					</DashboardTileGuard>
				)}
			</div>

			<div data-slot="dashboard-tile-actions" className={cn(k.actions)}>
				{clear}

				{actions !== undefined && (
					<DashboardTileGuard label={label} onError={onError}>
						{actions}
					</DashboardTileGuard>
				)}

				{controls}
			</div>
		</div>
	)
}
