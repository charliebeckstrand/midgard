/**
 * Identifier predicates shared by the build-time plugins, the api-reference
 * extractor, and the runtime walker.
 */

/** Whether `name` starts with an upper-case letter — the component/type-name convention. */
export function isPascalCase(name: string): boolean {
	return /^[A-Z]/.test(name)
}

/**
 * A whole-word matcher for one identifier. `$` is the one regex metacharacter
 * a JS identifier may contain, so it is the only character escaped.
 */
export function wordRe(name: string): RegExp {
	return new RegExp(`\\b${name.replaceAll('$', '\\$')}\\b`)
}
