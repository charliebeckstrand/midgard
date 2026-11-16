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
	/** The count of the resets, which names the run. Each reset starts a new run, also of the same seed. */
	run: number
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
 * With `autoDraw`, the game draws each number itself: when the setting comes on
 * (also at the load of the page), after each placement, and after a reset. A
 * placement and its draw are one update, so the page never renders the step
 * between them.
 */
export function useGame(seed: string, autoDraw: boolean): GameControls {
	const [game, setGame] = useState(() => createGame(seed))

	const [run, setRun] = useState(0)

	const status = getStatus(game)

	/** Draws the next number of `next` when the setting is on and `next` waits for a draw. */
	const settle = (next: Game) => (autoDraw && getStatus(next) === 'ready' ? drawNumber(next) : next)

	const drawOnSetting = useEffectEvent(() => {
		if (getStatus(game) === 'ready') setGame(drawNumber(game))
	})

	// The effect draws when the setting is on at the mount, and when it comes on
	// later. A draw changes the state, so the server render has no drawn number.
	useEffect(() => {
		if (autoDraw) drawOnSetting()
	}, [autoDraw])

	return {
		game,
		status,
		run,
		draw: () => setGame(drawNumber(game)),
		place: (index) => setGame(settle(placeNumber(game, index))),
		reset: (next) => {
			setGame(settle(createGame(next)))

			setRun((count) => count + 1)
		},
	}
}
