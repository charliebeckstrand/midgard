// A module of its own, so the server path of the request locale loads no
// catalog.

/**
 * The language subtag of a BCP 47 tag, in lowercase, such as `es` for `es-MX`.
 *
 * @internal
 */
export function getLanguage(tag: string): string {
	return tag.split('-')[0]?.toLowerCase() ?? ''
}
