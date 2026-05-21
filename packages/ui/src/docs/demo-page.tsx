'use client'

import { PanelLeft, PanelLeftDashed } from 'lucide-react'
import { use } from 'react'
import { Button } from '../components/button'
import { Heading } from '../components/heading'
import { Icon } from '../components/icon'
import { Stack } from '../components/stack'
import { SidebarLayoutHeader } from '../layouts'
import { ApiReference } from './api-reference'
import type { Demo } from './registry'
import { getComponentApi, loadDemo } from './registry'

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
				<div className="flex items-center gap-md">
					<Button
						variant="bare"
						className="max-lg:hidden"
						aria-label={locked ? 'Float sidebar' : 'Lock sidebar'}
						onClick={onToggleLocked}
					>
						<Icon icon={locked ? <PanelLeftDashed /> : <PanelLeft />} />
					</Button>
					<Heading>{demo.name}</Heading>
				</div>
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
