'use client'

import type { ReactNode } from 'react'
import { CardDescription, CardTitle } from '../../components/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { useTruncation } from '../../hooks/use-truncation'
import { k } from '../../recipes/kata/dashboard'
import { useDashboardTitleLevel } from './context'
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
 * The title of a tile, a heading at the `titleLevel` of the dashboard, clipped
 * to one line. When the title truncates, a hover
 * tooltip shows the full text. This is the reveal of the chart header and the
 * grid header.
 *
 * @remarks In edit mode the tooltip stays closed.
 * @internal
 */
function DashboardTileTitle({ id, title, editing }: DashboardTileTitleProps) {
	const [ref, truncated] = useTruncation<HTMLHeadingElement>()

	const level = useDashboardTitleLevel()

	return (
		<Tooltip disabled={!truncated || editing}>
			<TooltipTrigger>
				{/* `block` wins over the `inline-flex` of the trigger, because an
				    ellipsis paints only on a block box. */}
				<CardTitle ref={ref} id={id} level={level} className="block truncate">
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
	/** The app controls, after the title block. */
	actions?: ReactNode
	/** The control that clears the selection of the tile, before the actions. */
	clear?: ReactNode
	/** The element where the widget puts its own controls, after the actions. */
	widget?: ReactNode
	/** The drag grip in edit mode, or `null`. */
	handle: ReactNode
	/** The standard controls of the tile, at the far end of the row. */
	controls?: ReactNode
	/** Edit mode is on, so the title shows no tooltip. */
	editing: boolean
	/** Receives each error that a guard of the row catches. */
	onError: (error: unknown) => void
}

/**
 * The header row of a tile: the drag grip, the title block, the actions, the
 * controls of the widget, and the standard controls. The standard controls
 * come last, so the expand control is at the far end of the row.
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
	widget,
	handle,
	controls,
	editing,
	onError,
}: DashboardTileHeaderProps) {
	const slots = k()

	return (
		<div data-slot="card-header" className={slots.header}>
			{handle}

			<div className={slots.heading}>
				{title !== undefined && <DashboardTileTitle id={titleId} title={title} editing={editing} />}

				{description !== undefined && (
					<DashboardTileGuard label={label} onError={onError}>
						<CardDescription className="truncate">{description}</CardDescription>
					</DashboardTileGuard>
				)}
			</div>

			<div data-slot="dashboard-tile-actions" className={slots.actions}>
				{clear}

				{actions !== undefined && (
					<DashboardTileGuard label={label} onError={onError}>
						{actions}
					</DashboardTileGuard>
				)}
			</div>

			{widget}

			{controls}
		</div>
	)
}
