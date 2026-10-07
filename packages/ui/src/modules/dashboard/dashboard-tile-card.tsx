'use client'

import { memo, type ReactNode, type RefObject, useState } from 'react'
import { Card } from '../../components/card'
import { cn, dataAttr } from '../../core'
import type { ContentHeightHost } from '../../primitives/content-height'
import {
	createHeaderActionsHost,
	HeaderActionsContext,
	HeaderActionsSlot,
} from '../../primitives/header-actions'
import type { Mount } from '../../primitives/mount'
import { SortableGrip } from '../../primitives/sortable-grip/sortable-grip'
import { k } from '../../recipes/kata/dashboard'
import { DashboardTileClear } from './dashboard-tile-clear'
import { DashboardTileContent } from './dashboard-tile-content'
import { DashboardTileControls } from './dashboard-tile-controls'
import { DashboardTileExpand } from './dashboard-tile-expand'
import { DashboardTileHeader } from './dashboard-tile-header'
import type { DashboardTileDrag } from './use-dashboard-tile-drag'

/** Props for {@link DashboardTileCard}. @internal */
export type DashboardTileCardProps = {
	/** The id of the tile. */
	id: string
	/** The name of the tile, for the grip, the controls, and the error text. */
	label: string
	/** The id of the title element, which names the tile. */
	titleId: string
	/** The heading of the tile. */
	title?: string
	/** The muted line under the title. */
	description?: ReactNode
	/** The app controls at the far end of the header row. */
	actions?: ReactNode
	/** Whether the tile draws a header row. */
	hasHeader: boolean
	/** Whether the gestures of the board are live. */
	editable: boolean
	/** Whether this tile can move now, so the card shows its grip. */
	movable: boolean
	/** Whether this tile is the dragged tile. */
	dragging: boolean
	/** The props for the drag grip. */
	grip: DashboardTileDrag['grip']
	/** The mount policy of the content. */
	mount: Mount
	/** What the tile shows while its content suspends or is held back. */
	fallback: ReactNode
	/** Receives each error that a boundary of the tile catches. */
	onError: (error: unknown) => void
	/** Removes the tile. Without it, no remove control shows. */
	onRemove?: () => void
	/** Duplicates the tile. Without it, no duplicate control shows. */
	onDuplicate?: () => void
	/** Whether the expand control shows at rest. */
	expandable: boolean
	/** The `width / height` ratio of the tile on the board, which the expand dialog keeps. */
	shape: number
	/** The tile shell, which finds the tile that takes the focus after a remove. */
	shell: RefObject<HTMLElement | null>
	/** The box that the widget can claim the height of its content from. */
	host: ContentHeightHost
	/** Whether the content box takes the height of its content. */
	natural: boolean
	/** The widget. */
	children?: ReactNode
}

/**
 * The card of a tile: the grip, the header row, and the content box.
 *
 * It renders again only when one of its props changes by identity. Each tile
 * reads the dnd-kit context, which changes when a drag lifts and when it drops.
 * A tile that is not dragged keeps its grip. Such a change therefore renders
 * only the thin shell of that tile.
 *
 * @internal
 */
export const DashboardTileCard = memo(function DashboardTileCard({
	id,
	label,
	titleId,
	title,
	description,
	actions,
	hasHeader,
	editable,
	movable,
	dragging,
	grip,
	mount,
	fallback,
	onError,
	onRemove,
	onDuplicate,
	expandable,
	shape,
	shell,
	host,
	natural,
	children,
}: DashboardTileCardProps) {
	// The element in the header row where the widget puts its own controls, such
	// as the touch menu button of a chart. Edit mode shows the edit controls
	// there instead, so the widget then has no slot. A store, not state: the
	// element arrives after the first commit, and only the widget that reads it
	// renders again.
	const [widgetActions] = useState(createHeaderActionsHost)

	// The grip is the only part of the tile that starts a drag, so the rest of
	// the card keeps touch scrolling. With the keyboard, Space picks the tile
	// up, the arrow keys move it, and Space drops it. A tile with no header row
	// floats the grip on its corner.
	const handle = movable && (
		<SortableGrip
			data-slot="dashboard-handle"
			sortable={{ ...grip, dragging }}
			label={`Move ${label}`}
			className={cn(k.handle({ floating: !hasHeader, dragging }))}
		/>
	)

	// Edit mode swaps the edit controls in for the expand control.
	const controls = editable ? (
		<DashboardTileControls
			label={label}
			onRemove={onRemove}
			onDuplicate={onDuplicate}
			shell={shell}
		/>
	) : (
		expandable && (
			<DashboardTileExpand
				id={id}
				label={label}
				title={title}
				description={description}
				fallback={fallback}
				onError={onError}
				shape={shape}
				shell={shell}
			>
				{children}
			</DashboardTileExpand>
		)
	)

	return (
		<Card
			size="sm"
			bg="surface"
			{...(title === undefined ? {} : { role: 'group', 'aria-labelledby': titleId })}
			data-dragging={dataAttr(dragging)}
			className={cn(k.card({ editable: movable, dragging }))}
		>
			{!hasHeader && handle}

			{hasHeader && (
				<DashboardTileHeader
					label={label}
					titleId={titleId}
					title={title}
					description={description}
					actions={actions}
					clear={<DashboardTileClear id={id} label={label} />}
					widget={editable ? null : <HeaderActionsSlot host={widgetActions} />}
					handle={handle}
					editing={editable}
					onError={onError}
					controls={controls}
				/>
			)}

			<HeaderActionsContext value={widgetActions}>
				<DashboardTileContent
					id={id}
					label={label}
					mount={mount}
					inert={editable}
					fallback={fallback}
					onError={onError}
					host={host}
					natural={natural}
				>
					{children}
				</DashboardTileContent>
			</HeaderActionsContext>
		</Card>
	)
})
