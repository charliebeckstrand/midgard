'use client'

import { PanelLeft, PanelLeftDashed } from 'lucide-react'
import { Fragment, Suspense, use } from 'react'
import { useLocation } from 'react-router'
import { Button } from '../../components/button'
import { Heading } from '../../components/heading'
import { Icon } from '../../components/icon'
import { SidebarLayoutHeader } from '../../layouts'
import { Flex } from '../../structure/flex'
import { Stack } from '../../structure/stack'
import { AxesPrerenderContext, useAxesPrerender } from './axes-prerender'
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
 * The route body for one demo. It holds the lazily-loaded component, a
 * sidebar-lock toggle in the layout header, and the component's API reference
 * when one was extracted at build time.
 */
export function DemoPage({
	demo,
	locked,
	onToggleLocked,
}: {
	demo: Demo
	locked: boolean
	onToggleLocked: () => void
}) {
	const Component = use(loadDemo(demo.id))

	// The playground of `Axes` needs the API data. The page waits for the data,
	// so that the playground does not paint after the examples below it and push
	// them down.
	if (hasComponentApi(demo.id)) use(settleComponentApi(demo.id))

	// The reads of the prerender are for the page that the browser loaded. A
	// page that the reader opens after it reads its own axes.
	const prerender = useAxesPrerender()

	const { pathname } = useLocation()

	const loaded = prerender !== null && samePath(prerender.path, pathname)

	return (
		<Fragment>
			<SidebarLayoutHeader>
				<Flex align="center" gap="md">
					<Button
						variant="bare"
						className="max-lg:hidden"
						aria-label={locked ? 'Float sidebar' : 'Lock sidebar'}
						onClick={onToggleLocked}
					>
						<Icon icon={locked ? <PanelLeftDashed /> : <PanelLeft />} />
					</Button>
					<Heading>{demo.name}</Heading>
				</Flex>
			</SidebarLayoutHeader>
			<Stack gap="xl">
				{/* `Axes` in the demo reads the API data of the barrel from here. */}
				<DemoApiContext value={hasComponentApi(demo.id) ? loadComponentApi(demo.id) : null}>
					<AxesPrerenderContext value={loaded ? prerender : null}>
						<Component />
					</AxesPrerenderContext>
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
		</Fragment>
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

/** Whether two paths name the same page. The build renders `/alert` from the path `/alert/`. */
function samePath(a: string, b: string): boolean {
	const trim = (path: string) => (path.length > 1 ? path.replace(/\/$/, '') : path)

	return trim(a) === trim(b)
}
