import { Suspense } from 'react'
import { RecipesPage } from '@/components/recipes-page'

/**
 * The list. Every surface below it is interactive — the bar, the rows, the
 * drawer — and every fetch runs through TanStack Query, so the page holds no
 * data of its own and exists to mount the client tree.
 *
 * The boundary is what `useSearchParams` asks of a page that prerenders: the
 * address is not known while the shell is built, so the tree that reads it waits
 * for the browser.
 */
export default function Page() {
	return (
		<Suspense>
			<RecipesPage />
		</Suspense>
	)
}
