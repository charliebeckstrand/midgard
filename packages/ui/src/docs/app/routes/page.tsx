import { Outlet } from 'react-router'
import { PageError } from '../page-error.tsx'
import { PageTitle } from '../page-title.tsx'
import { useMatchedPage } from '../use-matched-page.ts'

/** The layout route of each page. It adds no markup, and it holds the error boundary of the pages. */
export default function Page() {
	return <Outlet />
}

/**
 * Shows in place of a page that fails to render. It renders in the outlet of
 * the shell, so the sidebar and the header stay, and a link to another page
 * clears the error.
 *
 * The shell gives no title to a page with tabs, because `PageTabs` gives the
 * title with the name of the tab. The error is in place of `PageTabs`, so it
 * gives the title of the page.
 */
export function ErrorBoundary() {
	const page = useMatchedPage()

	return (
		<>
			{page?.tabs.length ? <PageTitle page={page.name} /> : null}
			<PageError level={2} />
		</>
	)
}
