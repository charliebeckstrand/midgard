'use client'

import { Camera, EllipsisVertical, RotateCcw, Share2 } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'
import { useToast } from 'ui/toast'
import { shareScreenshot } from '../../utilities/screenshot'

/** Props for {@link GameBoardMenu}. */
export type GameBoardMenuProps = {
	/** Starts the run of a new seed. */
	onReset: () => void
}

/**
 * The menu beside the action: Reset starts the run of a new seed at each step,
 * also while a number waits. Share seed copies the address of the page, which
 * holds the seed, and a toast tells the reader the result. Share screenshot
 * gives an image of the screen to the share sheet of the device, or saves it,
 * and a toast tells the reader of a failure.
 */
export function GameBoardMenu({ onReset }: GameBoardMenuProps) {
	const { toast } = useToast()

	/** Copies the address of the run. The copy reads the address now, because a Reset writes a new one. */
	const share = () => {
		navigator.clipboard.writeText(window.location.href).then(
			() => toast({ title: 'Link copied', severity: 'success' }),
			() => toast({ title: 'The link could not be copied', severity: 'error' }),
		)
	}

	/** Shares an image of the screen. The share sheet needs the activation of this press (see `shareScreenshot`). */
	const screenshot = () => {
		shareScreenshot().catch(() =>
			toast({ title: 'The screenshot could not be shared', severity: 'error' }),
		)
	}

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

				<MenuItem onAction={share}>
					<Icon icon={<Share2 />} />
					<MenuLabel>Share seed</MenuLabel>
				</MenuItem>

				<MenuItem onAction={screenshot}>
					<Icon icon={<Camera />} />
					<MenuLabel>Share screenshot</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
