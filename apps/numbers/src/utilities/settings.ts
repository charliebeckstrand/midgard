/*
 * The settings of the game. Each setting is in a cookie, so the server renders
 * the page with the settings of the reader. A setting changes the layout (the
 * Draw button and the score bar), so the first paint is the final layout
 * (CONVENTIONS §3.13).
 */

import type { Difficulty } from './game'

/** The settings of the game, by name. */
export type GameSettings = {
	/** The game draws each number itself (see `useGame`). */
	autoDraw: boolean
	/** The bar at the bottom shows the score. */
	showScore: boolean
	/** The level of the CPU in Vs CPU (see `chooseSlot`). */
	difficulty: Difficulty
}

/** A setting of the game: its cookie, its value with no cookie, and its value for each cookie value. */
type Setting<T> = { cookie: string; fallback: T; values: Readonly<Record<string, T>> }

/** The cookie values of a switch. */
const SWITCH = { on: true, off: false }

/** The cookie, the default, and the values of each setting. */
export const SETTINGS: { [Name in keyof GameSettings]: Setting<GameSettings[Name]> } = {
	autoDraw: { cookie: 'numbers-auto-draw', fallback: true, values: SWITCH },
	showScore: { cookie: 'numbers-show-score', fallback: true, values: SWITCH },
	difficulty: {
		cookie: 'numbers-difficulty',
		fallback: 'normal',
		values: { easy: 'easy', normal: 'normal', hard: 'hard' },
	},
}

/** Gives the setting of `name` from the value of its cookie. A missing or unknown value gives the default. */
export function parseSetting<Name extends keyof GameSettings>(
	name: Name,
	value: string | undefined,
): GameSettings[Name] {
	const { values, fallback } = SETTINGS[name]

	return value !== undefined && Object.hasOwn(values, value)
		? (values[value] ?? fallback)
		: fallback
}

/** Gives the cookie value of `value`, the setting of `name`. */
export function formatSetting<Name extends keyof GameSettings>(
	name: Name,
	value: GameSettings[Name],
): string {
	const { values } = SETTINGS[name]

	// Each value of a setting has one cookie value, so the search always finds it.
	return Object.keys(values).find((key) => values[key] === value) ?? ''
}

/** Gives each setting from `read`, which gives the value of a cookie by its name. */
export function readSettings(read: (cookie: string) => string | undefined): GameSettings {
	return {
		autoDraw: parseSetting('autoDraw', read(SETTINGS.autoDraw.cookie)),
		showScore: parseSetting('showScore', read(SETTINGS.showScore.cookie)),
		difficulty: parseSetting('difficulty', read(SETTINGS.difficulty.cookie)),
	}
}
