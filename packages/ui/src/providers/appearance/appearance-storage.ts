import { readCookie, writeCookie } from '../../utilities/cookie'
import { createEmitter } from '../../utilities/emitter'
import { type DensityLevel, densityLevels } from '../density/context'
import {
	type MotionMode,
	motionModes,
	type SidebarMode,
	type SurfaceMode,
	sidebarModes,
	surfaceModes,
	type ThemeMode,
	themeModes,
} from './modes'

/**
 * One stored appearance choice: its key, the values it can hold, and the value
 * with no stored choice. A server reads the cookies and writes the classes on
 * the root element ({@link appearanceRootClasses}).
 *
 * @internal
 */
export type AppearanceChoice<T extends string> = {
	/**
	 * The name of the `localStorage` entry and of the cookie that hold the
	 * choice. A server reads the cookie with {@link parseChoice}. In the browser,
	 * the cookie wins over `localStorage`, so the server and the browser read
	 * the same value. The copy in `localStorage` tells the other tabs about a
	 * change, and it keeps the choice when the cookie expires.
	 */
	key: string
	values: readonly T[]
	fallback: T
}

/**
 * The theme choice. With no stored choice, it follows the OS.
 *
 * @internal
 */
export const THEME: AppearanceChoice<ThemeMode> = {
	key: 'theme',
	values: themeModes.map((option) => option.value),
	fallback: 'system',
}

/**
 * The density choice.
 *
 * @internal
 */
export const DENSITY: AppearanceChoice<DensityLevel> = {
	key: 'density',
	values: densityLevels.map((level) => level.value),
	fallback: 'snug',
}

/**
 * The motion choice. With no stored choice, it follows the platform.
 *
 * @internal
 */
export const MOTION: AppearanceChoice<MotionMode> = {
	key: 'motion',
	values: motionModes.map((option) => option.value),
	fallback: 'system',
}

/**
 * The sidebar choice. With no stored choice, the sidebar is locked.
 *
 * @internal
 */
export const SIDEBAR: AppearanceChoice<SidebarMode> = {
	key: 'sidebar',
	values: sidebarModes.map((option) => option.value),
	fallback: 'locked',
}

/**
 * The surfaces choice. With no stored choice, the surfaces are solid.
 *
 * @internal
 */
export const SURFACES: AppearanceChoice<SurfaceMode> = {
	key: 'surfaces',
	values: surfaceModes.map((option) => option.value),
	fallback: 'solid',
}

/**
 * Media query that is true when the OS prefers a dark color scheme.
 *
 * @internal
 */
export const DARK_SCHEME = '(prefers-color-scheme: dark)'

// Holds each choice whose write to storage throws (cookies off, a full quota,
// some embedded contexts). A read prefers it, so the choice still applies for
// the life of the page when `getItem` works and `setItem` throws.
const memory = new Map<string, string>()

const choiceChange = createEmitter()

// The value of `choice` in `localStorage`, or `undefined` when the value is
// absent or is not one of the values of the choice.
function readStored<T extends string>({ key, values }: AppearanceChoice<T>): T | undefined {
	let stored = memory.get(key) ?? null

	if (stored === null) {
		try {
			stored = localStorage.getItem(key)
		} catch {}
	}

	return values.find((value) => value === stored)
}

// The value of `choice` in its cookie, or `undefined` when the cookie holds no
// value of the choice.
function readMirror<T extends string>({ key, values }: AppearanceChoice<T>): T | undefined {
	const raw = readCookie(key)

	return values.find((value) => value === raw)
}

/**
 * Reads the stored value of `choice`: the value in its cookie, else the value
 * in `localStorage`, else the fallback of the choice. A value that is not one
 * of the values of the choice does not count.
 *
 * @internal
 */
export function readChoice<T extends string>(choice: AppearanceChoice<T>): T {
	return readMirror(choice) ?? readStored(choice) ?? choice.fallback
}

/**
 * The value of `choice` that `raw` holds, else the fallback of the choice. A
 * server reads the cookie of a choice with it.
 *
 * @internal
 */
export function parseChoice<T extends string>(
	{ values, fallback }: AppearanceChoice<T>,
	raw: string | null | undefined,
): T {
	return values.find((value) => value === raw) ?? fallback
}

/**
 * Stores `value` in `localStorage` and in the cookie of `choice`, and notifies
 * every subscriber in this page.
 *
 * @internal
 */
export function writeChoice<T extends string>({ key }: AppearanceChoice<T>, value: T) {
	try {
		localStorage.setItem(key, value)

		memory.delete(key)
	} catch {
		memory.set(key, value)
	}

	writeCookie(key, value)

	choiceChange.emit()
}

/**
 * Writes the value in `localStorage` to the cookie of `choice` when the cookie
 * holds no value of the choice. A choice stored before the choice had a cookie,
 * and a choice whose cookie expired, thus reach the server again. Call it in an
 * effect.
 *
 * @internal
 */
export function restoreChoiceCookie<T extends string>(choice: AppearanceChoice<T>) {
	if (readMirror(choice) !== undefined) return

	const stored = readStored(choice)

	if (stored !== undefined) writeCookie(choice.key, stored)
}

/**
 * Subscribes to changes of the stored choices: writes in this page, and
 * `storage` events from other tabs of the same origin.
 *
 * @internal
 */
export function subscribeChoices(listener: () => void) {
	const unsubscribe = choiceChange.subscribe(listener)

	// A write in another tab replaces the value in memory, so that write applies.
	const onStorage = (event: StorageEvent) => {
		if (event.key === null) memory.clear()
		else memory.delete(event.key)

		listener()
	}

	window.addEventListener('storage', onStorage)

	return () => {
		unsubscribe()

		window.removeEventListener('storage', onStorage)
	}
}
