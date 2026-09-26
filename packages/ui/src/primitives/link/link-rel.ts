/**
 * Resolve the `rel` of a link. A link that opens in a new browsing context
 * (`target="_blank"`) gets `noopener noreferrer`, so the new page cannot reach
 * `window.opener` or read the referrer. A caller `rel` always wins. This module
 * carries no `'use client'` directive, so static links can call it.
 *
 * @param target - The `target` of the link.
 * @param rel - The caller `rel`, if any.
 * @returns The `rel` to render, or `undefined` for no `rel`.
 * @internal
 */
export function resolveLinkRel(
	target: string | undefined,
	rel: string | undefined,
): string | undefined {
	return rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)
}
