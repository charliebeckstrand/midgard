'use client'

import { Activity, type ReactNode, useEffect } from 'react'
import { formatTitle } from 'shared/pages'
import { useAddressPath } from '../../hooks/use-address'
import { APP_NAME, OVERVIEW } from '../../utilities/trail'

/** A view of a page of an election, and the title of its page. */
export type ElectionView = { title: string; view: ReactNode }

/**
 * The key of the view of a path under `base`: {@link OVERVIEW} for `base`, else
 * the next segment. `null` for a path that is not under `base`.
 */
function viewKey(base: string, path: string): string | null {
	if (path === base) return OVERVIEW

	if (!path.startsWith(`${base}/`)) return null

	return path.slice(base.length + 1).split('/')[0] ?? null
}

/**
 * The view of each page of an election, which the layout renders. The view of
 * the current page is visible. The other views stay mounted and hidden, so a
 * switch to them shows a view that is already rendered.
 *
 * The current page is the path of the browser (`useAddressPath`), so the view
 * that an office switch picks shows at once, with no wait for the router. A
 * path that names no view here, such as Back to a state under the layout of
 * the election, keeps the view of the router until the router renders that
 * page.
 *
 * @param base - The path of the overview: the election, or a state.
 * @param views - The view of each key: {@link OVERVIEW}, or the slug of an office.
 */
export function ElectionViews({
	base,
	views,
}: {
	base: string
	views: Readonly<Record<string, ElectionView>>
}) {
	const { path, pathname } = useAddressPath()

	const browserKey = viewKey(base, path)

	const key = browserKey !== null && browserKey in views ? browserKey : viewKey(base, pathname)

	const shown = key === null ? undefined : views[key]

	// The router changes the title with the metadata of the page, but only once it
	// follows the browser. The title takes the template of the root layout.
	useEffect(() => {
		if (shown !== undefined) document.title = formatTitle(shown.title, APP_NAME)
	}, [shown])

	return Object.entries(views).map(([name, { view }]) => (
		<Activity key={name} mode={name === key ? 'visible' : 'hidden'}>
			{view}
		</Activity>
	))
}
