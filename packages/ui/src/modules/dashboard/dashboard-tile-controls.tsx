'use client'

import { Copy, X } from 'lucide-react'
import type { RefObject } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { announce } from '../../core'
import { defineMessages } from '../../primitives/intl/intl-define'
import { useIntl } from '../../primitives/intl/use-intl'
import { describeDuplicate, describeRemove } from './engine/dashboard-announcements'

const messages = defineMessages<{ duplicate: { item: string }; remove: { item: string } }>({
	duplicate: {
		id: 'ui.dashboard.duplicate',
		defaultMessage: 'Duplicate {item}',
		description: 'The name of the button that makes a copy of a dashboard tile.',
	},
	remove: {
		id: 'ui.dashboard.remove',
		defaultMessage: 'Remove {item}',
		description: 'The name of the button that removes a dashboard tile.',
	},
})

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

	const index = tiles.indexOf(shell)

	const order = [...tiles.slice(index + 1), ...tiles.slice(0, Math.max(0, index)).reverse()]

	const grip = order
		.map((tile) => tile.querySelector<HTMLElement>('[data-slot="dashboard-handle"]'))
		.find((el) => el !== null)

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
	const intl = useIntl()

	return (
		<>
			{onDuplicate && (
				<Button
					type="button"
					variant="bare"
					data-slot="dashboard-tile-duplicate"
					aria-label={intl.formatMessage(messages.duplicate, { item: label })}
					onClick={() => {
						announce(describeDuplicate(intl, label))

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
					data-slot="dashboard-tile-remove"
					aria-label={intl.formatMessage(messages.remove, { item: label })}
					onClick={() => {
						handOffFocus(shell.current)

						announce(describeRemove(intl, label))

						onRemove()
					}}
				>
					<Icon icon={<X />} />
				</Button>
			)}
		</>
	)
}
