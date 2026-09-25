'use client'

import { Copy, X } from 'lucide-react'
import type { RefObject } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { announce } from '../../core'
import { describeDuplicate, describeRemove } from './engine/dashboard-announcements'

/** Props for {@link DashboardTileControls}. @internal */
export type DashboardTileControlsProps = {
	/** The name of the tile, for the accessible names and the live region. */
	label: string
	/** Removes the tile. Without it, no remove control shows. */
	onRemove?: () => void
	/** Duplicates the tile. Without it, no duplicate control shows. */
	onDuplicate?: () => void
	/** The tile shell, which finds the tile that takes the focus after a remove. */
	shell: RefObject<HTMLElement | null>
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
 * The edit controls of a tile, at the far end of its header row: duplicate and
 * remove. Each control tells the live region what it did.
 *
 * @internal
 */
export function DashboardTileControls({
	label,
	onRemove,
	onDuplicate,
	shell,
}: DashboardTileControlsProps) {
	return (
		<>
			{onDuplicate && (
				<Button
					type="button"
					variant="bare"
					size="sm"
					data-slot="dashboard-tile-duplicate"
					aria-label={`Duplicate ${label}`}
					onClick={() => {
						announce(describeDuplicate(label))

						onDuplicate()
					}}
				>
					<Icon icon={<Copy />} />
				</Button>
			)}

			{onRemove && (
				<Button
					type="button"
					variant="bare"
					size="sm"
					data-slot="dashboard-tile-remove"
					aria-label={`Remove ${label}`}
					onClick={() => {
						handOffFocus(shell.current)

						announce(describeRemove(label))

						onRemove()
					}}
				>
					<Icon icon={<X />} />
				</Button>
			)}
		</>
	)
}
