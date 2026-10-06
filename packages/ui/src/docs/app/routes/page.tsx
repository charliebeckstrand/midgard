import { Outlet } from 'react-router'
import { PageError } from '../page-error.tsx'

/** The layout route of each page. It adds no markup, and it holds the error boundary of the pages. */
export default function Page() {
	return <Outlet />
}

/**
 * Shows in place of a page that fails to render. It renders in the outlet of
 * the shell, so the sidebar and the header stay, and a link to another page
 * clears the error.
 */
export function ErrorBoundary() {
	return <PageError />
}
