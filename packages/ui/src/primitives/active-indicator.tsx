'use client'

import { LayoutGroup, type MotionStyle, motion, useAnimate } from 'motion/react'
import type React from 'react'
import { createContext, useCallback, useContext, useId, useMemo } from 'react'
import { cn } from '../core'
import { katachi, ugoki } from '../recipes'

const ActiveIndicatorContext = createContext<string | undefined>(undefined)

/** Scopes active indicators so independent nav / tab groups can coexist. */
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

/** Animated indicator that morphs between sibling items via layoutId spring physics. Returns a ref and tap handlers for the parent container. */
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
}: {
	ref?: React.Ref<HTMLSpanElement>
	layoutId?: string
	className?: string
	style?: MotionStyle
	children?: React.ReactNode
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
		>
			{children}
		</motion.span>
	)
}
