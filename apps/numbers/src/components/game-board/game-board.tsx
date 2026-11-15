'use client'

import { type MouseEvent, useEffect, useEffectEvent, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useA11yAnnouncements } from 'ui/hooks'
import { useIntl } from 'ui/primitives/intl'
import { useAutoDraw } from '../../hooks/use-auto-draw'
import { useGame } from '../../hooks/use-game'
import { type Game, SLOTS, type Status } from '../../utilities/game'
import { createSeed, isSeed } from '../../utilities/seed'
import { GameBoardSlots } from './game-board-slots'
import { GameBoardToolbar } from './game-board-toolbar'

/** The text that a screen reader speaks for each step: the drawn number, a bust, or a win. */
function describeStatus(game: Game, status: Status, format: (value: number) => string): string {
	if (status === 'won') return `All ${format(SLOTS)} placed`

	if (game.drawn === null) return ''

	return status === 'bust' ? `${format(game.drawn)} has no slot` : format(game.drawn)
}

/** Props for {@link GameBoard}. */
export type GameBoardProps = {
	/** The seed of the address, which the run of the page starts from. */
	seed: string
}

/**
 * The game: the bar with the drawn number and its action, and the column of
 * slots under it.
 *
 * A Reset starts the run of a new seed in place, and adds the address of the
 * seed to the history, so the reader can send the run. Back and Forward go to
 * the run of the seed of the address, from its start.
 *
 * @remarks
 * An action can turn off the control that the reader pressed: Draw is off
 * while a number waits, and a filled slot is off. The focus then moves to the
 * next control to use: the first slot that can take the number, or else the
 * action button. The move happens only when the pressed control had the focus,
 * so a tap on a phone moves no focus.
 */
export function GameBoard({ seed }: GameBoardProps) {
	const [autoDraw] = useAutoDraw()

	const { game, status, draw, place, reset } = useGame(seed, autoDraw)

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

	/** Starts the run of a new seed, and writes its address. */
	const restart = () => {
		const next = createSeed()

		window.history.pushState(null, '', `/${next}`)

		reset(next)
	}

	/** Starts the run of the seed of the address, after Back or Forward. */
	const follow = useEffectEvent(() => {
		const next = window.location.pathname.slice(1)

		if (isSeed(next) && next !== game.seed) reset(next)
	})

	useEffect(() => {
		window.addEventListener('popstate', follow)

		return () => window.removeEventListener('popstate', follow)
	}, [])

	const ended = status === 'bust' || status === 'won'

	return (
		<div className="mx-auto w-full max-w-md px-4">
			<GameBoardToolbar
				game={game}
				status={status}
				actionRef={actionRef}
				onAction={(event) => act(event, ended ? restart : draw)}
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
