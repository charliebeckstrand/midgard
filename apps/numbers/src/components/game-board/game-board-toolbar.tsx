'use client'

import { type MouseEvent, type Ref, useEffect, useState } from 'react'
import { Button } from 'ui/button'
import { Odometer } from 'ui/odometer'
import { Text, type TextProps } from 'ui/text'
import { Toolbar, ToolbarGroup } from 'ui/toolbar'
import { type Game, isEnded, type Status } from '../../utilities/game'
import { GameBoardMenu } from './game-board-menu'

/** The tone of the readout at each step: full while a number waits, red on a bust, and muted else. */
const TONES: Record<Status, TextProps['tone']> = {
	ready: 'muted',
	placing: 'default',
	bust: 'error',
	won: 'muted',
}

/**
 * The readout of the drawn number. It shows 0 at its mount, and then rolls to
 * `value`. The toolbar mounts it again for each run. Thus the first number of
 * each run rolls from 0, also when it is near the last number of the run
 * before.
 */
function RunReadout({ value }: { value: number }) {
	const [mounted, setMounted] = useState(false)

	useEffect(() => setMounted(true), [])

	return <Odometer value={mounted ? value : 0} />
}

/** Props for {@link GameBoardToolbar}. */
export type GameBoardToolbarProps = {
	game: Game
	status: Status
	/** The run of the board, from `useGame`. A new run starts the readout again from 0. */
	run: number
	/** Draws the next number, or starts a new game after a bust or a win. */
	onAction: (event: MouseEvent<HTMLButtonElement>) => void
	/** The ref of the action button. */
	actionRef: Ref<HTMLButtonElement>
	/** Starts the run of a new seed, from the menu, at each step. */
	onReset: () => void
	/** Shows the action. With Auto-draw on, the game draws itself, so the bar shows the action only as Reset. */
	showAction: boolean
}

/**
 * The bar of the drawn number and the action, at the top of the game, over the
 * box of the slots. The readout rolls to each new number, and the first number
 * of each run rolls from 0. Before the first draw it shows 0, and after a
 * placement it keeps the number. The action is Draw. It is off while a number
 * waits for a slot, and it is Reset after a bust (in red) and after a win. With
 * Auto-draw on, the bar has no Draw, and the action shows only as Reset. The
 * menu beside the action holds Reset at each step. The bar has 1rem of space on
 * each side, as the score bar has.
 */
export function GameBoardToolbar({
	game,
	status,
	run,
	onAction,
	actionRef,
	onReset,
	showAction,
}: GameBoardToolbarProps) {
	const ended = isEnded(status)

	return (
		<div className="mx-auto w-full max-w-md shrink-0 p-4">
			<Toolbar variant="solid" aria-label="Number" className="items-center justify-between ps-4">
				<Text as="span" tone={TONES[status]} className="font-semibold text-3xl tabular-nums">
					<RunReadout key={run} value={game.last ?? 0} />
				</Text>

				<ToolbarGroup>
					{showAction && (
						<Button
							ref={actionRef}
							color={status === 'bust' ? 'red' : undefined}
							disabled={status === 'placing'}
							onClick={onAction}
						>
							{ended ? 'Reset' : 'Draw'}
						</Button>
					)}

					<GameBoardMenu onReset={onReset} />
				</ToolbarGroup>
			</Toolbar>
		</div>
	)
}
