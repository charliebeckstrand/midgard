'use client'

import { PanelLeft, PanelLeftDashed } from 'lucide-react'
import { Fragment, Suspense, use } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Heading } from '../../components/heading'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
import { SidebarLayoutHeader } from '../../layouts'
import { ApiReference } from './components/api-reference'
import type { Demo } from './registry'
import { hasComponentApi, loadComponentApi, loadDemo } from './registry'

/**
 * The route body for one demo: its lazily-loaded component, a sidebar-lock
 * toggle in the layout header, and the component's API reference when one was
 * extracted at build time.
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
				<Component />
				{hasComponentApi(demo.id) && (
					// Its own boundary so the demo paints immediately while the API
					// data's chunk streams in, rather than suspending the whole route.
					<Suspense fallback={null}>
						<ApiReferenceSection id={demo.id} />
					</Suspense>
				)}
			</Stack>
		</Fragment>
	)
}

/** The API-reference section for a component, suspending on its lazy chunk. */
function ApiReferenceSection({ id }: { id: string }) {
	const api = use(loadComponentApi(id))

	return (
		<Stack gap="sm">
			<Heading level={2}>API Reference</Heading>
			<ApiReference api={api} />
		</Stack>
	)
}
