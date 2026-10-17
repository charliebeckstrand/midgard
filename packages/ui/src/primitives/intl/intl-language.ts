// No `react-intl` import: the server resolves a request locale through this
// module, and `react-intl` is a client module.

/**
 * The language subtag of a BCP 47 tag, in lowercase, such as `es` for `es-MX`.
 *
 * @internal
 */
export function languageOf(tag: string): string {
	return tag.split('-')[0]?.toLowerCase() ?? ''
}
