'use client'

import { memo, type ReactNode, type RefObject } from 'react'
import { Card } from '../../components/card'
import { cn, dataAttr } from '../../core'
import type { Mount } from '../../primitives/mount'
import { k } from '../../recipes/kata/dashboard'
import { DashboardDragHandle } from './dashboard-drag-handle'
import { DashboardTileClear } from './dashboard-tile-clear'
import { DashboardTileContent } from './dashboard-tile-content'
import { DashboardTileControls } from './dashboard-tile-controls'
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
	/** The pointer listener that starts a drag anywhere on the card. */
	surface: DashboardTileDrag['surface']
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
	/** The tile shell, which finds the tile that takes the focus after a remove. */
	shell: RefObject<HTMLElement | null>
	/** The widget. */
	children?: ReactNode
}

/**
 * The card of a tile: the grip, the header row, and the content box.
 *
 * It renders again only when one of its props changes by identity. Each tile
 * reads the dnd-kit context, which changes when a drag lifts and when it drops.
 * A tile that is not dragged keeps its grip and its pointer listener. Such a
 * change therefore renders only the thin shell of that tile.
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
	surface,
	mount,
	fallback,
	onError,
	onRemove,
	onDuplicate,
	expandable,
	shell,
	children,
}: DashboardTileCardProps) {
	const handle = movable && (
		<DashboardDragHandle
			{...grip}
			label={`Move ${label}`}
			floating={!hasHeader}
			dragging={dragging}
		/>
	)

	return (
		<Card
			size="sm"
			bg="surface"
			{...(title === undefined ? {} : { role: 'group', 'aria-labelledby': titleId })}
			{...(movable ? surface : {})}
			// The pointer drags the card itself, so the card closes the grab hand too.
			data-dragging={dataAttr(dragging)}
			className={cn(
				k.card({ editable: movable, dragging }),
				k.veil.overlay,
				!editable && k.veil.fade,
			)}
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
					handle={handle}
					editing={editable}
					onError={onError}
					controls={
						<DashboardTileControls
							id={id}
							label={label}
							title={title}
							description={description}
							editing={editable}
							onRemove={onRemove}
							onDuplicate={onDuplicate}
							expandable={expandable}
							fallback={fallback}
							onError={onError}
							shell={shell}
						>
							{children}
						</DashboardTileControls>
					}
				/>
			)}

			<DashboardTileContent
				id={id}
				label={label}
				mount={mount}
				inert={editable}
				fallback={fallback}
				onError={onError}
			>
				{children}
			</DashboardTileContent>
		</Card>
	)
})
