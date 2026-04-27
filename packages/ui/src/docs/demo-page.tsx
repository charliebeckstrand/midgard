'use client'

import { use } from 'react'
import { Heading } from '../components/heading'
import { Stack } from '../components/stack'
import { SidebarLayoutHeader } from '../layouts'
import { ApiReference } from './components/api-reference'
import type { Demo } from './registry'
import { getComponentApi, loadDemo } from './registry'

export function DemoPage({ demo }: { demo: Demo }) {
	const Component = use(loadDemo(demo.id))

	const api = getComponentApi(demo.id)

	return (
		<>
			<SidebarLayoutHeader>
				<Heading>{demo.name}</Heading>
			</SidebarLayoutHeader>
			<Stack gap={6}>
				<Component />
				{api && (
					<Stack gap={2}>
						<Heading level={2}>API Reference</Heading>
						<ApiReference api={api} />
					</Stack>
				)}
			</Stack>
		</>
	)
}
