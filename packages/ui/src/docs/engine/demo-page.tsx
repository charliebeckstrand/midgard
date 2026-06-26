'use client'

import { PanelLeft, PanelLeftDashed } from 'lucide-react'
import { use } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Heading } from '../../components/heading'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
import { SidebarLayoutHeader } from '../../layouts'
import { ApiReference } from './components/api-reference'
import { DemoNav, DemoNavProvider } from './components/demo-nav'
import type { Demo } from './registry'
import { getComponentApi, loadDemo } from './registry'

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

	const api = getComponentApi(demo.id)

	return (
		<DemoNavProvider>
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
				<DemoNav />
				<Component />
				{api && (
					<Stack gap="sm">
						<Heading level={2}>API Reference</Heading>
						<ApiReference api={api} />
					</Stack>
				)}
			</Stack>
		</DemoNavProvider>
	)
}
