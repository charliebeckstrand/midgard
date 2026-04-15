'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type ComponentType, useEffect, useRef, useState } from 'react'
import { Heading } from '../components/heading'
import { ApiReference } from './components/api-reference'
import type { Demo } from './registry'
import { getComponentApi, getResolvedDemo, loadDemo } from './registry'

export function DemoPage({ demo }: { demo: Demo }) {
	const [Component, setComponent] = useState<ComponentType | null>(() => getResolvedDemo(demo.id))

	const isPage = demo.category === 'Pages'

	const api = isPage ? undefined : getComponentApi(demo.id)

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
					className="mx-auto w-full space-y-4 px-2 lg:p-6 lg:px-6"
				>
					<Heading>{demo.name}</Heading>
					<Component />
					{api && (
						<>
							<Heading level={2} className="leading-none">
								API Reference
							</Heading>
							<ApiReference api={api} />
						</>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	)
}
