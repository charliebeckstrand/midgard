import { createEmitter } from '../../utilities'
import { type DensityLevel, densityLevels } from '../density/context'
import {
	type MotionMode,
	motionModes,
	type SidebarMode,
	sidebarModes,
	type ThemeMode,
	themeModes,
} from './modes'

/**
 * One stored appearance choice: its `localStorage` key, the values it can
 * hold, and the value with no stored choice. {@link AppearanceScript} reads
 * the same keys before hydration.
 *
 * @internal
 */
export type AppearanceChoice<T extends string> = {
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
 * Media query that is true when the OS prefers a dark color scheme.
 *
 * @internal
 */
export const DARK_SCHEME = '(prefers-color-scheme: dark)'

// Holds the choices when storage access throws (cookies off, some embedded
// contexts), so a choice still applies for the life of the page.
const memory = new Map<string, string>()

const choiceChange = createEmitter()

/**
 * Reads the stored value of `choice`. It returns the fallback of the choice
 * when the value is absent or is not one of its values.
 *
 * @internal
 */
export function readChoice<T extends string>({ key, values, fallback }: AppearanceChoice<T>): T {
	let stored: string | null = null

	try {
		stored = localStorage.getItem(key)
	} catch {
		stored = memory.get(key) ?? null
	}

	return values.find((value) => value === stored) ?? fallback
}

/**
 * Stores `value` under `key` and notifies every subscriber in this page.
 *
 * @internal
 */
export function writeChoice(key: string, value: string) {
	try {
		localStorage.setItem(key, value)
	} catch {
		memory.set(key, value)
	}

	choiceChange.emit()
}

/**
 * Subscribes to changes of the stored choices: writes in this page, and
 * `storage` events from other tabs of the same origin.
 *
 * @internal
 */
export function subscribeChoices(listener: () => void) {
	const unsubscribe = choiceChange.subscribe(listener)

	window.addEventListener('storage', listener)

	return () => {
		unsubscribe()

		window.removeEventListener('storage', listener)
	}
}
