'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type ComponentType, useEffect, useRef, useState } from 'react'
import { Heading } from '../components/heading'
import { Stack } from '../components/stack'
import { SidebarLayoutHeader } from '../layouts'
import { ApiReference } from './components/api-reference'
import type { Demo } from './registry'
import { getComponentApi, getResolvedDemo, loadDemo } from './registry'

export function DemoPage({ demo }: { demo: Demo }) {
	const [Component, setComponent] = useState<ComponentType | null>(() => getResolvedDemo(demo.id))

	const api = getComponentApi(demo.id)

	const loadingId = useRef(demo.id)

	const isFirstRender = useRef(true)

	useEffect(() => {
		loadingId.current = demo.id

		loadDemo(demo.id).then((comp) => {
			if (loadingId.current === demo.id) setComponent(() => comp)
		})
	}, [demo.id])

	return (
		<AnimatePresence mode="wait">
			{Component && (
				<motion.div
					key={demo.id}
					initial={isFirstRender.current ? false : { opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
					onAnimationComplete={() => {
						isFirstRender.current = false
					}}
				>
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
				</motion.div>
			)}
		</AnimatePresence>
	)
}
