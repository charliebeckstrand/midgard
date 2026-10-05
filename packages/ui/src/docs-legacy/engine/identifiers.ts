/**
 * Identifier predicates shared by the build-time plugins and the api-reference
 * extractor.
 */

/** Whether `name` starts with an upper-case letter — the component/type-name convention. */
export function isPascalCase(name: string): boolean {
	return /^[A-Z]/.test(name)
}
