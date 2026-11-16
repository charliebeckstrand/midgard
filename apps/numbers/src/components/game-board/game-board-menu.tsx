'use client'

import { EllipsisVertical, RotateCcw } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'

/** Props for {@link GameBoardMenu}. */
export type GameBoardMenuProps = {
	/** Starts the run of a new seed. */
	onReset: () => void
}

/**
 * The menu beside the action: Reset starts the run of a new seed at each step,
 * also while a number waits.
 */
export function GameBoardMenu({ onReset }: GameBoardMenuProps) {
	return (
		<Menu placement="bottom-end">
			<MenuTrigger>
				<Button variant="plain" aria-label="Run actions">
					<Icon icon={<EllipsisVertical />} />
				</Button>
			</MenuTrigger>

			<MenuContent aria-label="Run actions">
				<MenuItem onAction={onReset}>
					<Icon icon={<RotateCcw />} />
					<MenuLabel>Reset</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
