'use client'

import { type MouseEvent, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useA11yAnnouncements } from 'ui/hooks'
import { useIntl } from 'ui/primitives/intl'
import { useAutoDraw } from '../../hooks/use-auto-draw'
import { useGame } from '../../hooks/use-game'
import { type Game, SLOTS, type Status } from '../../utilities/game'
import { GameBoardSlots } from './game-board-slots'
import { GameBoardToolbar } from './game-board-toolbar'

/** The text that a screen reader speaks for each step: the drawn number, a bust, or a win. */
function describeStatus(game: Game, status: Status, format: (value: number) => string): string {
	if (status === 'won') return `All ${format(SLOTS)} placed`

	if (game.drawn === null) return ''

	return status === 'bust' ? `${format(game.drawn)} has no slot` : format(game.drawn)
}

/**
 * The game: the bar with the drawn number and its action, and the column of
 * slots under it.
 *
 * @remarks
 * An action can turn off the control that the reader pressed: Draw is off
 * while a number waits, and a filled slot is off. The focus then moves to the
 * next control to use: the first slot that can take the number, or else the
 * action button. The move happens only when the pressed control had the focus,
 * so a tap on a phone moves no focus.
 */
export function GameBoard() {
	const [autoDraw] = useAutoDraw()

	const { game, status, draw, place, reset } = useGame(autoDraw)

	const actionRef = useRef<HTMLButtonElement>(null)

	const slotsRef = useRef<HTMLDivElement>(null)

	const intl = useIntl()

	useA11yAnnouncements(describeStatus(game, status, intl.formatNumber))

	/** Runs `action`, then gives the focus to the next control when the pressed control had it. */
	const act = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
		const focused = event.currentTarget === document.activeElement

		// The update commits before the focus moves, so the next control is on.
		flushSync(action)

		if (!focused) return

		const slot = slotsRef.current?.querySelector<HTMLButtonElement>('button:enabled')

		;(slot ?? actionRef.current)?.focus()
	}

	const ended = status === 'bust' || status === 'won'

	return (
		<div className="mx-auto w-full max-w-md px-4">
			<GameBoardToolbar
				game={game}
				status={status}
				actionRef={actionRef}
				onAction={(event) => act(event, ended ? reset : draw)}
			/>

			<GameBoardSlots
				ref={slotsRef}
				game={game}
				status={status}
				onPlace={(index, event) => act(event, () => place(index))}
			/>
		</div>
	)
}
