'use client'

import { type MotionStyle, motion, type Transition, useAnimate } from 'motion/react'
import type React from 'react'
import { useCallback } from 'react'
import { cn } from '../core'

const spring: Transition = {
	type: 'spring',
	stiffness: 200,
	damping: 20,
	mass: 0.8,
}

const tapSpring: Transition = {
	type: 'spring',
	stiffness: 500,
	damping: 15,
}

/**
 * Animated active/current indicator that morphs between sibling items.
 *
 * Renders a full background pill that flows between positions using
 * layoutId with fluid spring physics. The low damping creates a
 * liquid, organic feel as it travels between items.
 *
 * Place inside the item's relative container. Content should be
 * positioned above with `relative z-10` so it renders on top.
 *
 * Returns `tapHandlers` to spread on the parent container so tapping
 * the active item triggers a springy scale pulse on the indicator.
 */
export function useActiveIndicator() {
	const [scope, animate] = useAnimate<HTMLSpanElement>()

	const onPointerDown = useCallback(() => {
		animate(scope.current, { scale: 0.97 }, tapSpring)
	}, [animate, scope])

	const onPointerUp = useCallback(() => {
		animate(scope.current, { scale: 1 }, tapSpring)
	}, [animate, scope])

	return { ref: scope, tapHandlers: { onPointerDown, onPointerUp, onPointerLeave: onPointerUp } }
}

export function ActiveIndicator({
	ref,
	layoutId = 'current-indicator',
	className,
	style,
}: {
	ref?: React.Ref<HTMLSpanElement>
	layoutId?: string
	className?: string
	style?: MotionStyle
}) {
	return (
		<motion.span
			ref={ref}
			layoutId={layoutId}
			className={cn('absolute inset-0 rounded-lg bg-zinc-950/5 dark:bg-white/10', className)}
			style={{ borderRadius: 8, ...style }}
			transition={spring}
		/>
	)
}
