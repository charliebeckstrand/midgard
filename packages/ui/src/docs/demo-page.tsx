'use client'

import { Divider } from '../components/divider'
import { Heading } from '../components/heading'
import { ApiReference } from './components/api-reference'
import type { Demo } from './registry'

export function DemoPage({ demo }: { demo: Demo }) {
	return (
		<div className="mx-auto w-full space-y-4 px-2 lg:p-6 lg:px-6">
			<Heading>{demo.name}</Heading>
			<demo.component />
			{demo.api && (
				<>
					<Divider />
					<Heading level={2}>API Reference</Heading>
					<ApiReference api={demo.api} />
				</>
			)}
		</div>
	)
}
