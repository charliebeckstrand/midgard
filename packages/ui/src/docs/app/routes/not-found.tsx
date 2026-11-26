import { useLocation } from 'react-router'
import { Stack } from 'ui/stack'
import { PageSuggestions } from '../../search/ui/page-suggestions.tsx'

/**
 * Any path with no page. The host serves the fallback document, and the router
 * shows this page under its "Page not found" title, with the pages that the
 * path most likely names.
 */
export default function NotFound() {
	const { pathname } = useLocation()

	return (
		<Stack gap="md" align="start">
			<PageSuggestions path={pathname} />
		</Stack>
	)
}
