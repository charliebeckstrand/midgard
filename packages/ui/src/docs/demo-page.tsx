'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type ComponentType, useEffect, useRef, useState } from 'react'
import { Heading } from '../components/heading'
import { ApiReference } from './components/api-reference'
import type { ComponentApi } from './parse-props'
import type { Demo } from './registry'
import { getComponentApi, loadDemo } from './registry'

export function DemoPage({ demo }: { demo: Demo }) {
	const [ready, setReady] = useState<{
		id: string
		Component: ComponentType
		api: ComponentApi[] | undefined
	} | null>(null)

	const loadingId = useRef<string | null>(null)

	useEffect(() => {
		loadingId.current = demo.id

		Promise.all([loadDemo(demo.id), getComponentApi(demo.id)]).then(([comp, apiResult]) => {
			if (loadingId.current === demo.id) {
				setReady({ id: demo.id, Component: comp, api: apiResult })
			}
		})
	}, [demo.id])

	return (
		<AnimatePresence mode="wait">
			{ready && (
				<motion.div
					key={ready.id}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
					className="mx-auto w-full space-y-4 px-2 lg:p-6 lg:px-6"
				>
					<Heading>{demo.name}</Heading>
					<ready.Component />
					{ready.api && (
						<>
							<Heading level={2}>API Reference</Heading>
							<ApiReference api={ready.api} />
						</>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	)
}
