'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type ComponentType, useEffect, useRef, useState } from 'react'
import { Heading } from '../components/heading'
import { Spinner } from '../components/spinner'
import { ApiReference } from './components/api-reference'
import type { ComponentApi } from './parse-props'
import type { Demo } from './registry'
import { getComponentApi, getResolvedDemo, loadDemo } from './registry'

export function DemoPage({ demo }: { demo: Demo }) {
	const [Component, setComponent] = useState<ComponentType | null>(() => getResolvedDemo(demo.id))

	const [api, setApi] = useState<ComponentApi[] | undefined | null>(undefined)

	const loadingId = useRef(demo.id)

	const isFirstRender = useRef(true)

	useEffect(() => {
		loadingId.current = demo.id

		loadDemo(demo.id).then((comp) => {
			if (loadingId.current === demo.id) setComponent(() => comp)
		})

		getComponentApi(demo.id).then((result) => {
			if (loadingId.current === demo.id) setApi(result ?? null)
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
					{api === undefined && <Spinner size="xl" />}
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
