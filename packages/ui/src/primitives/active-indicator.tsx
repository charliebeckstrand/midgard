'use client'

import { LayoutGroup, type MotionStyle, motion, useAnimate } from 'motion/react'
import {
	createContext,
	type PropsWithChildren,
	type ReactNode,
	type Ref,
	useCallback,
	useContext,
	useId,
	useMemo,
} from 'react'
import { cn } from '../core'
import { maru, ugoki } from '../recipes'

const ActiveIndicatorContext = createContext<string | undefined>(undefined)

/** Scopes active indicators so independent nav / tab groups can coexist. */
export function ActiveIndicatorScope({ children, id }: PropsWithChildren<{ id?: string }>) {
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

	return useMemo(
		() => ({
			ref: scope,
			tapHandlers: { onPointerDown, onPointerUp, onPointerLeave: onPointerUp },
		}),
		[scope, onPointerDown, onPointerUp],
	)
}

export function ActiveIndicator({
	ref,
	layoutId,
	className,
	style,
	children,
}: {
	ref?: Ref<HTMLSpanElement>
	layoutId?: string
	className?: string
	style?: MotionStyle
	children?: ReactNode
}) {
	const scopedLayoutId = useContext(ActiveIndicatorContext)

	const resolvedLayoutId = layoutId ?? scopedLayoutId ?? 'current-indicator'

	// Unique per instance, stable per render — gates willUpdate so external
	// reflow doesn't animate the indicator, while still differing from the
	// previous instance so Motion's promote() runs the shared-element transition.
	const instanceId = useId()

	return (
		<motion.span
			ref={ref}
			layoutId={resolvedLayoutId}
			layoutDependency={instanceId}
			className={cn('absolute inset-0', 'bg-zinc-300 dark:bg-zinc-600', maru.rounded.lg, className)}
			style={{ borderRadius: 8, ...style }}
			transition={ugoki.spring}
		>
			{children}
		</motion.span>
	)
}
