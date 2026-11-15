'use client'

import type { MouseEvent, Ref } from 'react'
import { Button } from 'ui/button'
import { Odometer } from 'ui/odometer'
import { Text, type TextProps } from 'ui/text'
import { Toolbar, ToolbarGroup } from 'ui/toolbar'
import type { Game, Status } from '../../utilities/game'
import { GameBoardMenu } from './game-board-menu'

/** The tone of the readout at each step: full while a number waits, red on a bust, and muted else. */
const TONES: Record<Status, TextProps['tone']> = {
	ready: 'muted',
	placing: 'default',
	bust: 'error',
	won: 'muted',
}

/** Props for {@link GameBoardToolbar}. */
export type GameBoardToolbarProps = {
	game: Game
	status: Status
	/** Draws the next number, or starts a new game after a bust or a win. */
	onAction: (event: MouseEvent<HTMLButtonElement>) => void
	/** The ref of the action button. */
	actionRef: Ref<HTMLButtonElement>
	/** Starts the run of a new seed, from the menu, at each step. */
	onReset: () => void
}

/**
 * The bar of the drawn number and the action, which stays at the top while
 * the slots scroll under it. The readout rolls to each new number. Before the
 * first draw it shows 0, and after a placement it keeps the number. The action
 * is Draw. It is off while a number waits for a slot, and it is Reset after a
 * bust (in red) and after a win. The menu beside the action holds Reset and
 * Share seed at each step.
 */
export function GameBoardToolbar({
	game,
	status,
	onAction,
	actionRef,
	onReset,
}: GameBoardToolbarProps) {
	const ended = status === 'bust' || status === 'won'

	return (
		// The ground of the page under the bar hides the slots that scroll under it.
		<div className="sticky top-0 z-10 bg-(--surface-fill) py-3">
			<Toolbar variant="solid" aria-label="Number" className="items-center justify-between ps-4">
				<Text as="span" tone={TONES[status]} className="font-semibold text-4xl/10 tabular-nums">
					<Odometer value={game.last ?? 0} />
				</Text>

				<ToolbarGroup>
					<Button
						ref={actionRef}
						color={status === 'bust' ? 'red' : undefined}
						disabled={status === 'placing'}
						onClick={onAction}
					>
						{ended ? 'Reset' : 'Draw'}
					</Button>

					<GameBoardMenu onReset={onReset} />
				</ToolbarGroup>
			</Toolbar>
		</div>
	)
}
