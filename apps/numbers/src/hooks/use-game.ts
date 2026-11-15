'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import {
	createGame,
	drawNumber,
	type Game,
	getStatus,
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
	/** Starts a new game. */
	reset: () => void
}

/**
 * The state of one game, and its actions.
 *
 * With `autoDraw`, the game draws each number itself: when the setting comes on
 * (also at the load of the page), after each placement, and after a reset. A
 * placement and its draw are one update, so the page never renders the step
 * between them.
 */
export function useGame(autoDraw: boolean): GameControls {
	const [game, setGame] = useState(createGame)

	const status = getStatus(game)

	/** Draws the next number of `next` when the setting is on and `next` waits for a draw. */
	const settle = (next: Game) => (autoDraw && getStatus(next) === 'ready' ? drawNumber(next) : next)

	const drawOnSetting = useEffectEvent(() => {
		if (getStatus(game) === 'ready') setGame(drawNumber(game))
	})

	// The setting is off at the hydration, and the stored setting comes after it.
	useEffect(() => {
		if (autoDraw) drawOnSetting()
	}, [autoDraw])

	return {
		game,
		status,
		draw: () => setGame(drawNumber(game)),
		place: (index) => setGame(settle(placeNumber(game, index))),
		reset: () => setGame(settle(createGame())),
	}
}
