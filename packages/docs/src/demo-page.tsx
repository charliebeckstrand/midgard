'use client'

import { PanelLeft, PanelLeftDashed } from 'lucide-react'
import { use } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { SidebarLayoutHeader } from 'ui/layouts'
import { Stack } from 'ui/stack'
import { ApiReference } from './components/api-reference'
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
		<>
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
				{api && (
					<Stack gap="sm">
						<Heading level={2}>API Reference</Heading>
						<ApiReference api={api} />
					</Stack>
				)}
			</Stack>
		</>
	)
}
