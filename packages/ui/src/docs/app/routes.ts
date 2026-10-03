import { index, type RouteConfig, route } from '@react-router/dev/routes'
import { namespaces } from '../engine/demo-id'

// A component page is at `/<id>`, and a namespaced page is at
// `/<namespace>/<name>` (`demoPath`). A tab adds one more part to the path. A
// static part outranks a parameter, so `/structure/box` is never the page
// `structure` with the tab `box`.
export default [
	index('routes/home.tsx'),
	...namespaces.map((namespace) =>
		route(`${namespace}/:name/:tab?`, 'routes/demo.tsx', { id: `demo-${namespace}` }),
	),
	route(':id/:tab?', 'routes/demo.tsx'),
] satisfies RouteConfig
