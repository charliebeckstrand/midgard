'use client'

import { PanelLeft, PanelLeftDashed } from 'lucide-react'
import { use, useMemo } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Heading } from '../../components/heading'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
import { SidebarLayoutHeader } from '../../layouts'
import { ApiReference } from './components/api-reference'
import { DemoNav, DemoNavProvider } from './components/demo-nav'
import { DefaultDemoLayout } from './components/demo-tabs'
import { type DemoRoute, DemoRouteContext } from './demo-route'
import type { Demo } from './registry'
import { getComponentApi, loadDemo, loadLayoutOr } from './registry'

/**
 * The route body for one demo: its layout (the folder's `layout.tsx`, or the
 * default tab bar for a tabbed demo without one) around the active tab's
 * lazily-loaded page, a sidebar-lock toggle in the layout header, and the
 * component's API reference when one was extracted at build time.
 */
export function DemoPage({
	demo,
	tab,
	locked,
	onToggleLocked,
}: {
	demo: Demo
	tab: string
	locked: boolean
	onToggleLocked: () => void
}) {
	const Layout = use(loadLayoutOr(demo.id, DefaultDemoLayout))

	const Component = use(loadDemo(demo.id, tab))

	const api = getComponentApi(demo.id)

	const route = useMemo<DemoRoute>(() => ({ demo, tab }), [demo, tab])

	return (
		<DemoRouteContext value={route}>
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
						<DemoNav />
						<Heading>{demo.name}</Heading>
					</Flex>
				</SidebarLayoutHeader>
				<Stack gap="xl">
					<Layout>
						<Component />
					</Layout>
					{api && (
						<Stack gap="sm">
							<Heading level={2}>API Reference</Heading>
							<ApiReference api={api} />
						</Stack>
					)}
				</Stack>
			</DemoNavProvider>
		</DemoRouteContext>
	)
}
