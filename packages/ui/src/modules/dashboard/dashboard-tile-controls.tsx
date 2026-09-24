'use client'

import { Copy, X } from 'lucide-react'
import type { PointerEvent, ReactNode, RefObject } from 'react'
import { Icon } from '../../components/icon'
import { announce, cn } from '../../core'
import { k } from '../../recipes/kata/dashboard'
import { DashboardTileExpand } from './dashboard-tile-expand'
import { describeDuplicate, describeRemove } from './engine/dashboard-announcements'

/** Props for {@link DashboardTileControls}. @internal */
export type DashboardTileControlsProps = {
	/** The id of the tile. */
	id: string
	/** The name of the tile, for the accessible names and the live region. */
	label: string
	/** The heading of the tile, for the expand dialog. */
	title?: string
	/** The muted line under the title, for the expand dialog. */
	description?: ReactNode
	/** Whether the gestures are live, so the edit controls show. */
	editing: boolean
	/** Removes the tile. Without it, no remove control shows. */
	onRemove?: () => void
	/** Duplicates the tile. Without it, no duplicate control shows. */
	onDuplicate?: () => void
	/** Whether the expand control shows at rest. */
	expandable: boolean
	/** What the expand dialog shows while the content suspends. */
	fallback: ReactNode
	/** Receives each error that the boundary in the expand dialog catches. */
	onError: (error: unknown) => void
	/** The tile shell, which finds the tile that takes the focus after a remove. */
	shell: RefObject<HTMLElement | null>
	/** The widget, which the expand dialog renders again. */
	children?: ReactNode
}

/**
 * Keeps a press on a control from starting a drag. In edit mode the card is a
 * drag surface, and a press that moves a few px would otherwise lift the tile.
 */
function holdDrag(event: PointerEvent<HTMLElement>): void {
	event.stopPropagation()
}

/**
 * Moves the focus off a tile that a remove takes away. The focus goes to the
 * grip of the next tile, else of the previous tile, else to the board. It
 * therefore never falls to the page.
 */
function handOffFocus(shell: HTMLElement | null): void {
	const canvas = shell?.parentElement

	if (!shell || !canvas) return

	const tiles = [...canvas.querySelectorAll<HTMLElement>(':scope > [data-slot="dashboard-tile"]')]

	const at = tiles.indexOf(shell)

	const order = [...tiles.slice(at + 1), ...tiles.slice(0, Math.max(0, at)).reverse()]

	const grip = order
		.map((tile) => tile.querySelector<HTMLElement>('[data-slot="dashboard-handle"]'))
		.find((element) => element !== null)

	;(grip ?? canvas.closest<HTMLElement>('[data-slot="dashboard"]'))?.focus()
}

/**
 * The standard controls of a tile, at the far end of its header row. In edit
 * mode they are duplicate and remove; at rest, expand. Each control that changes
 * the board tells the live region what it did.
 *
 * @internal
 */
export function DashboardTileControls({
	id,
	label,
	title,
	description,
	editing,
	onRemove,
	onDuplicate,
	expandable,
	fallback,
	onError,
	shell,
	children,
}: DashboardTileControlsProps) {
	if (!editing) {
		if (!expandable) return null

		return (
			<DashboardTileExpand
				id={id}
				label={label}
				title={title}
				description={description}
				fallback={fallback}
				onError={onError}
			>
				{children}
			</DashboardTileExpand>
		)
	}

	return (
		<>
			{onDuplicate && (
				<button
					type="button"
					data-slot="dashboard-tile-duplicate"
					aria-label={`Duplicate ${label}`}
					className={cn(k.control)}
					onPointerDown={holdDrag}
					onClick={() => {
						announce(describeDuplicate(label))

						onDuplicate()
					}}
				>
					<Icon icon={<Copy />} size="sm" />
				</button>
			)}

			{onRemove && (
				<button
					type="button"
					data-slot="dashboard-tile-remove"
					aria-label={`Remove ${label}`}
					className={cn(k.control)}
					onPointerDown={holdDrag}
					onClick={() => {
						handOffFocus(shell.current)

						announce(describeRemove(label))

						onRemove()
					}}
				>
					<Icon icon={<X />} size="sm" />
				</button>
			)}
		</>
	)
}
