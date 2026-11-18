'use client'

import { useState } from 'react'
import {
	createGame,
	drawNumber,
	type Game,
	getStatus,
	isEnded,
	placeNumber,
	type Status,
} from '../utilities/game'

/** What {@link useGame} gives. */
export type GameControls = {
	game: Game
	status: Status
	/** Draws the next number. */
	draw: () => void
	/** Puts the drawn number in the slot at `index`. */
	place: (index: number) => void
	/** Starts the run of `seed`. */
	reset: (seed: string) => void
}

/**
 * The state of the run of `seed`, and its actions.
 *
 * With `autoDraw`, the game draws each number itself: at the start of each run,
 * and after each placement. A placement and its draw are one update, so the
 * page never renders the step between them. The caller draws when the setting
 * comes on during a run (`useGameSettingChange`), so a run that the reader left
 * does not draw when its held route shows again. The first
 * draw of the run of the page is in the first state: the deck comes from the
 * seed, so the server render and the hydration have the same drawn number, and
 * the first paint shows it.
 *
 * `onEnd` gets the game once when a draw or a placement ends the run in a bust
 * or a win. It runs in the action, not in an effect, so a route that shows
 * again does not end its run a second time.
 */
export function useGame(
	seed: string,
	autoDraw: boolean,
	onEnd?: (game: Game) => void,
): GameControls {
	/** Draws the next number of `next` when the setting is on and `next` waits for a draw. */
	const settle = (next: Game) => (autoDraw && getStatus(next) === 'ready' ? drawNumber(next) : next)

	const [game, setGame] = useState(() => settle(createGame(seed)))

	const status = getStatus(game)

	/** Sets the next state of a draw or a placement, and gives an ended run to `onEnd`. */
	const advance = (next: Game) => {
		setGame(next)

		if (isEnded(getStatus(next))) onEnd?.(next)
	}

	return {
		game,
		status,
		draw: () => advance(drawNumber(game)),
		place: (index) => advance(settle(placeNumber(game, index))),
		reset: (next) => setGame(settle(createGame(next))),
	}
}
