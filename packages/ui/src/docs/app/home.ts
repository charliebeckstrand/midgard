/**
 * The page that the root path of the docs goes to: Accordion, the first page
 * of the sidebar. The docs have no home page of their own, because the sidebar
 * lists and searches each page. A link of the docs names this page, not `/`.
 */
export const HOME = '/accordion'

/**
 * Where a request for `target` goes, such as `/accordion?lang=es` for
 * `/?lang=es`, or `undefined` for a target that is not the root path. The
 * server of the docs and the dev server answer the root path with a redirect,
 * so the browser loads the first page and never renders the root path.
 */
export function homeRedirect(target: string): string | undefined {
	return /^\/(?:[?#]|$)/.test(target) ? `${HOME}${target.slice(1)}` : undefined
}
