import { index, type RouteConfig, route } from '@react-router/dev/routes'

export default [
	index('routes/home.tsx'),
	route(':id/:tab?', 'routes/demo.tsx'),
] satisfies RouteConfig
