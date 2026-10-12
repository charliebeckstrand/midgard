// The ids of the anchors of a page. The docs plugin reads them too, so this
// file imports nothing.

/** The id of the heading of the API reference of a page. */
export const API = 'api'

/**
 * The id of an entry of the API reference, such as `api-Button`, or of one
 * prop in the entry, such as `api-Button-variant`. A component name has no
 * hyphen, so the first hyphen after the prefix ends it.
 */
export function apiIdOf(component: string, prop?: string): string {
	return prop === undefined ? `${API}-${component}` : `${API}-${component}-${prop}`
}

/**
 * The component of the entry that the hash of the location names, as
 * `#api-Button` or `#api-Button-variant` name `Button`. It gives `undefined`
 * for any other hash.
 */
export function componentOfHash(hash: string): string | undefined {
	const prefix = `#${API}-`

	if (!hash.startsWith(prefix)) return undefined

	return hash.slice(prefix.length).split('-')[0] || undefined
}
