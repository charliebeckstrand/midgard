'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type PointerEvent, useCallback, useRef, useState } from 'react'

interface RippleEntry {
	key: number
	x: number
	y: number
	size: number
}

export function useRipple({ duration = 0.5 }: { duration?: number } = {}) {
	const [ripples, setRipples] = useState<RippleEntry[]>([])

	const counter = useRef(0)

	const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
		const rect = e.currentTarget.getBoundingClientRect()

		const size = Math.max(rect.width, rect.height) * 2

		setRipples((prev) => [
			...prev,
			{
				key: counter.current++,
				x: e.clientX - rect.left,
				y: e.clientY - rect.top,
				size,
			},
		])
	}, [])

	const remove = useCallback((key: number) => {
		setRipples((prev) => prev.filter((r) => r.key !== key))
	}, [])

	const element = (
		<span
			aria-hidden
			className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none"
		>
			<AnimatePresence>
				{ripples.map((r) => (
					<motion.span
						key={r.key}
						className="absolute bg-current rounded-full"
						style={{
							left: r.x - r.size / 2,
							top: r.y - r.size / 2,
							width: r.size,
							height: r.size,
						}}
						initial={{ scale: 0, opacity: 0.25 }}
						animate={{ scale: 1, opacity: 0 }}
						transition={{ duration }}
						onAnimationComplete={() => remove(r.key)}
					/>
				))}
			</AnimatePresence>
		</span>
	)

	return { onPointerDown, element }
}
