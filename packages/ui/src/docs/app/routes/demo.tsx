import { Navigate, useLocation } from 'react-router'
import { DemoRoute } from '../../engine/app'
import { demoPath, parseDemoPath } from '../../engine/demo-id'
import { demos } from '../../engine/registry'

// A path from before nested paths (`/structure-box`, `/grid/Sorting`) has no
// prerendered file, so the host serves the fallback document. The page moves
// to its current path, which has a namespace folder and a lowercase tab.
export default function DemoPageRoute() {
	const { pathname, search, hash } = useLocation()

	const { id, tab } = parseDemoPath(pathname)

	const path = demoPath(id, tab?.toLowerCase())

	if (demos.some((demo) => demo.id === id) && path !== pathname.replace(/\/$/, '')) {
		return <Navigate to={`${path}${search}${hash}`} replace />
	}

	return <DemoRoute id={id} />
}
