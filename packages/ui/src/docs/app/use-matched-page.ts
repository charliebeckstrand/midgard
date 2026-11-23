import pages from 'virtual:docs/pages'
import { useMatches } from 'react-router'
import type { PageLink } from '../plugin/pages.ts'

/**
 * The page of the matched route. A path that only starts with the path of a
 * page, such as `/button/foo`, matches the not-found route, so it has no page.
 */
export function useMatchedPage(): PageLink | undefined {
	const matches = useMatches()

	return pages.find((link) => matches.some((match) => match.id === link.path))
}
