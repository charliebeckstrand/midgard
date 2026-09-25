/**
 * `localStorage` key of the theme preference. {@link AppearanceScript} reads
 * the same key before hydration.
 *
 * @internal
 */
export const THEME_KEY = 'theme'

/**
 * `localStorage` key of the density preference.
 *
 * @internal
 */
export const DENSITY_KEY = 'density'

/**
 * Media query that is true when the OS prefers a dark color scheme.
 *
 * @internal
 */
export const DARK_SCHEME = '(prefers-color-scheme: dark)'

// Holds the choices when storage access throws (cookies off, some embedded
// contexts), so a choice still applies for the life of the page.
const memory = new Map<string, string>()

const listeners = new Set<() => void>()

/**
 * Reads the stored choice under `key`. It returns `fallback` when the value is
 * absent or is not one of `options`.
 *
 * @internal
 */
export function readChoice<T extends string>(key: string, options: readonly T[], fallback: T): T {
	let stored: string | null = null

	try {
		stored = localStorage.getItem(key)
	} catch {
		stored = memory.get(key) ?? null
	}

	return options.find((option) => option === stored) ?? fallback
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

	for (const listener of [...listeners]) listener()
}

/**
 * Subscribes to changes of the stored choices: writes in this page, and
 * `storage` events from other tabs of the same origin.
 *
 * @internal
 */
export function subscribeChoices(listener: () => void) {
	listeners.add(listener)

	window.addEventListener('storage', listener)

	return () => {
		listeners.delete(listener)

		window.removeEventListener('storage', listener)
	}
}
