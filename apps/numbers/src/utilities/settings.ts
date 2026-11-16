/*
 * The settings of the game. Each setting is in a cookie, so the server renders
 * the page with the settings of the reader. A setting changes the layout (the
 * Draw button, the score bar, and the column of the CPU), so the first paint
 * is the final layout (CONVENTIONS §3.13).
 */

/** A setting of the game: its cookie, and its value with no cookie. */
type Setting = { cookie: string; fallback: boolean }

/** The settings of the game, by name. */
export type GameSettings = {
	/** The game draws each number itself (see `useGame`). */
	autoDraw: boolean
	/** The bar at the bottom shows the score. */
	showScore: boolean
	/** The CPU plays the same deck beside the player (see `playCpu`). */
	vsCpu: boolean
}

/** The cookie and the default of each setting. */
export const SETTINGS: Record<keyof GameSettings, Setting> = {
	autoDraw: { cookie: 'numbers-auto-draw', fallback: false },
	showScore: { cookie: 'numbers-show-score', fallback: true },
	vsCpu: { cookie: 'numbers-vs-cpu', fallback: false },
}

/** Gives the setting of `name` from the value of its cookie. A missing or unknown value gives the default. */
export function parseSetting(name: keyof GameSettings, value: string | undefined): boolean {
	if (value === 'on') return true

	if (value === 'off') return false

	return SETTINGS[name].fallback
}

/** Gives each setting from `read`, which gives the value of a cookie by its name. */
export function readSettings(read: (cookie: string) => string | undefined): GameSettings {
	return {
		autoDraw: parseSetting('autoDraw', read(SETTINGS.autoDraw.cookie)),
		showScore: parseSetting('showScore', read(SETTINGS.showScore.cookie)),
		vsCpu: parseSetting('vsCpu', read(SETTINGS.vsCpu.cookie)),
	}
}
