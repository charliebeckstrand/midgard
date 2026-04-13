'use client'

import { Suspense, useEffect, useState } from 'react'
import { Heading } from '../components/heading'
import { Spinner } from '../components/spinner'
import { ApiReference } from './components/api-reference'
import type { ComponentApi } from './parse-props'
import type { Demo } from './registry'
import { getComponentApi, getLazyComponent } from './registry'

export function DemoPage({ demo }: { demo: Demo }) {
	const Component = getLazyComponent(demo.id)

	const [api, setApi] = useState<ComponentApi[] | undefined>(undefined)

	useEffect(() => {
		let cancelled = false

		getComponentApi(demo.id).then((result) => {
			if (!cancelled) setApi(result)
		})

		return () => {
			cancelled = true
		}
	}, [demo.id])

	return (
		<div className="mx-auto w-full space-y-4 px-2 lg:p-6 lg:px-6">
			<Heading>{demo.name}</Heading>
			<Suspense
				fallback={
					<div className="flex justify-center p-12">
						<Spinner />
					</div>
				}
			>
				<Component />
			</Suspense>
			{api && (
				<>
					<Heading level={2}>API Reference</Heading>
					<ApiReference api={api} />
				</>
			)}
		</div>
	)
}
