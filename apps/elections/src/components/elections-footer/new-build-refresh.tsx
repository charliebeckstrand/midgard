'use client'

import { useNewBuild } from 'shared/refresh'

/**
 * The notice of a new build, with a link that reloads the page. It shows only
 * after a deploy, when the live refresh stops: the page then cannot take new
 * results until a reload loads the new build.
 */
export function NewBuildRefresh() {
	const newBuild = useNewBuild()

	if (!newBuild) return null

	return (
		<span className="block text-zinc-600 dark:text-zinc-300">
			{'New build available. '}
			<button
				type="button"
				onClick={() => window.location.reload()}
				className="cursor-pointer rounded-sm underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
			>
				Refresh
			</button>
		</span>
	)
}
