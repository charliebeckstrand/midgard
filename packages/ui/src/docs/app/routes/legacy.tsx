import { Navigate, useLocation, useRouteLoaderData } from 'react-router'
import { Heading } from '../../../components/heading'
import type { loader } from '../root'

// A path from before the paths of today, such as `/structure-box` or
// `/modules-grid/Sorting`, has no file in the build, so the host serves the
// fallback document. The page moves to its path of today, with a lowercase
// tab.
export default function Legacy() {
	const pages = useRouteLoaderData<typeof loader>('root')?.pages ?? []

	const { pathname, search, hash } = useLocation()

	const [id, tab] = pathname.split('/').filter(Boolean)

	const page = pages.find((candidate) => candidate.id === id)

	if (!page) {
		return (
			<div className="p-6">
				<Heading>Select a component</Heading>
			</div>
		)
	}

	return (
		<Navigate to={`${page.path}${tab ? `/${tab.toLowerCase()}` : ''}${search}${hash}`} replace />
	)
}
