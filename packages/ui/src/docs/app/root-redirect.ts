/** The page that the root path goes to: Accordion, the first page of the sidebar. */
const PAGE = '/accordion'

/**
 * Where a request for `target` goes, such as `/accordion?lang=es` for
 * `/?lang=es`, or `undefined` for a target that is not the root path. The root
 * path has no page, because the sidebar lists and searches each page. The
 * server of the docs and the dev server answer it with a redirect, so the
 * browser loads the first page and never renders the root path.
 */
export function rootRedirect(target: string): string | undefined {
	return /^\/(?:[?#]|$)/.test(target) ? `${PAGE}${target.slice(1)}` : undefined
}
