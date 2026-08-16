import { Suspense } from 'react'
import { RotaPage } from '@/components/rota-page'

/**
 * The week board. The whole tree is interactive and every fetch runs through
 * TanStack Query, so the page holds no data of its own.
 *
 * The boundary is what `useSearchParams` asks of a page that prerenders: the
 * week is not known while the shell is built, so the tree that reads it waits
 * for the browser.
 */
export default function Page() {
	return (
		<Suspense>
			<RotaPage />
		</Suspense>
	)
}
