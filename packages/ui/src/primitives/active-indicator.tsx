'use client'

import { LayoutGroup, type MotionStyle, motion, useAnimate } from 'motion/react'
import type React from 'react'
import { createContext, useCallback, useContext, useId, useMemo } from 'react'
import { cn } from '../core'
import { katachi, ugoki } from '../recipes'

const ActiveIndicatorContext = createContext<string | undefined>(undefined)

/**
 * Creates a local scope for active indicators so multiple independent
 * nav/tab/sidebar groups can coexist on the same page.
 */
export function ActiveIndicatorScope({ children, id }: React.PropsWithChildren<{ id?: string }>) {
	const fallbackId = useId()

	const scopeId = id ?? fallbackId

	const layoutId = useMemo(() => `current-indicator-${scopeId}`, [scopeId])

	return (
		<ActiveIndicatorContext.Provider value={layoutId}>
			<LayoutGroup id={layoutId}>{children}</LayoutGroup>
		</ActiveIndicatorContext.Provider>
	)
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
		animate(scope.current, { scale: 0.99 }, ugoki.spring)
	}, [animate, scope])

	const onPointerUp = useCallback(() => {
		animate(scope.current, { scale: 1 }, ugoki.spring)
	}, [animate, scope])

	return { ref: scope, tapHandlers: { onPointerDown, onPointerUp, onPointerLeave: onPointerUp } }
}

export function ActiveIndicator({
	ref,
	layoutId,
	className,
	style,
	children,
	onLayoutAnimationComplete,
}: {
	ref?: React.Ref<HTMLSpanElement>
	layoutId?: string
	className?: string
	style?: MotionStyle
	children?: React.ReactNode
	onLayoutAnimationComplete?: () => void
}) {
	const scopedLayoutId = useContext(ActiveIndicatorContext)

	const resolvedLayoutId = layoutId ?? scopedLayoutId ?? 'current-indicator'

	return (
		<motion.span
			ref={ref}
			layoutId={resolvedLayoutId}
			className={cn(katachi.activeIndicator, className)}
			style={{ borderRadius: 8, ...style }}
			transition={ugoki.spring}
			onLayoutAnimationComplete={onLayoutAnimationComplete}
		>
			{children}
		</motion.span>
	)
}
