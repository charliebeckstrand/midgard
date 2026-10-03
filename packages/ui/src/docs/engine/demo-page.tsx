import { Suspense, use } from 'react'
import { Heading } from '../../components/heading'
import { Stack } from '../../structure/stack'
import { DemoApiContext } from './components/axes'
import { DemoErrorBoundary } from './components/error-boundary'
import type { Demo } from './registry'
import {
	hasComponentApi,
	loadApiReferenceView,
	loadComponentApi,
	loadDemo,
	settleComponentApi,
} from './registry'

/**
 * The route body for one demo. It holds the lazily-loaded component and the
 * component's API reference when one was extracted at build time. The header
 * of the page is part of the `App` chrome.
 */
export function DemoPage({ demo }: { demo: Demo }) {
	const Component = use(loadDemo(demo.id))

	// The playground of `Axes` needs the API data. The page waits for the data,
	// so that the playground does not paint after the examples below it and push
	// them down.
	if (hasComponentApi(demo.id)) use(settleComponentApi(demo.id))

	return (
		<Stack gap="xl">
			{/* `Axes` in the demo reads the API data of the barrel from here. */}
			<DemoApiContext value={hasComponentApi(demo.id) ? loadComponentApi(demo.id) : null}>
				<Component />
			</DemoApiContext>
			{hasComponentApi(demo.id) && (
				// The page waits for the API data, so the data is ready here, except
				// after a failure and a retry. Its own error boundary makes a failed
				// chunk degrade to nothing, instead of replacing the already-rendered
				// demo through the route-level boundary. The rejection stays cached,
				// so the section stays empty until a sidebar prefetch re-attempts it.
				<DemoErrorBoundary fallback={() => null}>
					<Suspense fallback={null}>
						<ApiReferenceSection id={demo.id} />
					</Suspense>
				</DemoErrorBoundary>
			)}
		</Stack>
	)
}

/**
 * The API-reference section for a component. It suspends on its lazy data and
 * on the chunk of its view. A barrel with nothing to document renders nothing.
 */
function ApiReferenceSection({ id }: { id: string }) {
	const api = use(loadComponentApi(id))

	const ApiReference = use(loadApiReferenceView())

	if (api.length === 0) return null

	return (
		<Stack gap="sm">
			<Heading level={2}>API reference</Heading>
			<ApiReference api={api} />
		</Stack>
	)
}
