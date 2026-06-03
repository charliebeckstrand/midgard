'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type PointerEvent, useCallback, useMemo, useRef, useState } from 'react'
import { ReducedMotion } from '../primitives/reduced-motion'

type RippleEntry = {
	key: number
	x: number
	y: number
	size: number
}

type UseRippleOptions = {
	duration?: number
}

/** Material-style click ripple: returns a pointerdown handler plus the overlay element to render inside a relatively-positioned target. */
export function useRipple({ duration = 0.5 }: UseRippleOptions = {}) {
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
		setRipples((prev) => prev.filter((ripple) => ripple.key !== key))
	}, [])

	const element = useMemo(
		() => (
			<ReducedMotion>
				<span
					aria-hidden
					className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none"
				>
					<AnimatePresence>
						{ripples.map((ripple) => (
							<motion.span
								key={ripple.key}
								className="absolute bg-current rounded-full"
								style={{
									left: ripple.x - ripple.size / 2,
									top: ripple.y - ripple.size / 2,
									width: ripple.size,
									height: ripple.size,
								}}
								initial={{ scale: 0, opacity: 0.25 }}
								animate={{ scale: 1, opacity: 0 }}
								transition={{ duration }}
								onAnimationComplete={() => remove(ripple.key)}
							/>
						))}
					</AnimatePresence>
				</span>
			</ReducedMotion>
		),
		[ripples, duration, remove],
	)

	return { onPointerDown, element }
}
