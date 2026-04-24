'use client'

import { type ComponentType, useEffect, useRef, useState } from 'react'
import { Heading } from '../components/heading'
import { Stack } from '../components/stack'
import { SidebarLayoutHeader } from '../layouts'
import { ApiReference } from './components/api-reference'
import type { Demo } from './registry'
import { getComponentApi, getResolvedDemo, loadDemo } from './registry'

type Displayed = { demo: Demo; Component: ComponentType }

export function DemoPage({ demo }: { demo: Demo }) {
	// Keep the last successfully-loaded demo on screen while the next one's
	// chunk is in flight. Swapping only once the new module resolves avoids
	// a blank frame during navigation.
	const [displayed, setDisplayed] = useState<Displayed | null>(() => {
		const Component = getResolvedDemo(demo.id)

		return Component ? { demo, Component } : null
	})

	const targetId = useRef(demo.id)

	useEffect(() => {
		targetId.current = demo.id

		const cached = getResolvedDemo(demo.id)

		if (cached) {
			setDisplayed({ demo, Component: cached })

			return
		}

		loadDemo(demo.id).then((Component) => {
			if (targetId.current === demo.id) setDisplayed({ demo, Component })
		})
	}, [demo])

	if (!displayed) return null

	const { demo: shown, Component } = displayed

	const api = getComponentApi(shown.id)

	return (
		<>
			<SidebarLayoutHeader>
				<Heading>{shown.name}</Heading>
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
