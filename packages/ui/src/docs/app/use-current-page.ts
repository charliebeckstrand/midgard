import { use, useCallback, useSyncExternalStore } from 'react'
import { PathnameContext } from '../../primitives/current/context.ts'
import type { PageLink } from '../plugin/pages.ts'

/**
 * The page in `pages` whose path is the path of `UIProvider`. The shell gives
 * `UIProvider` the path of the matched page. The hook subscribes to the path
 * of each page, so it renders again only when the current page changes.
 */
export function useCurrentPage(pages: readonly PageLink[]): PageLink | undefined {
	const exact = use(PathnameContext)?.exact

	const subscribe = useCallback(
		(listener: () => void) => {
			const stops = pages.map((page) => exact?.subscribe(page.path, listener))

			return () => {
				for (const stop of stops) stop?.()
			}
		},
		[exact, pages],
	)

	const read = () => pages.find((page) => exact?.get(page.path))

	return useSyncExternalStore(subscribe, read, read)
}
