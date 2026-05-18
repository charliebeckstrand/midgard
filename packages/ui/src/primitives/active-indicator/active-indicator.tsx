'use client'

import { LayoutGroup, type MotionStyle, motion, useAnimate } from 'motion/react'
import { type ReactNode, type Ref, useCallback, useId, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { ugoki } from '../../recipes'
import { ReducedMotion } from '../reduced-motion'

const [ActiveIndicatorScopeProvider, useActiveIndicatorScope] = createContext<string | undefined>(
	'ActiveIndicatorScope',
	{ default: undefined },
)

/** Scopes active indicators so independent nav / tab groups can coexist. */
export function ActiveIndicatorScope({ children, id }: { id?: string; children: ReactNode }) {
	const fallbackId = useId()

	const scopeId = id ?? fallbackId

	const layoutId = useMemo(() => `current-indicator-${scopeId}`, [scopeId])

	return (
		<ActiveIndicatorScopeProvider value={layoutId}>
			<ReducedMotion>
				<LayoutGroup id={layoutId}>{children}</LayoutGroup>
			</ReducedMotion>
		</ActiveIndicatorScopeProvider>
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

/**
 * Visual marker that morphs between sibling items via Motion's shared-element
 * transition. Resolves its `layoutId` from the nearest `ActiveIndicatorScope`
 * so independent groups (nav, tabs) don't trade animations.
 */
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
	const scopedLayoutId = useActiveIndicatorScope()

	const resolvedLayoutId = layoutId ?? scopedLayoutId ?? 'current-indicator'

	// Unique per instance, stable per render — gates willUpdate so external
	// reflow doesn't animate the indicator, while still differing from the
	// previous instance so Motion's promote() runs the shared-element transition.
	const instanceId = useId()

	return (
		<ReducedMotion>
			<motion.span
				ref={ref}
				data-slot="active-indicator"
				layoutId={resolvedLayoutId}
				layoutDependency={instanceId}
				className={cn('absolute inset-0', 'bg-zinc-300 dark:bg-zinc-600', 'rounded-lg', className)}
				style={{ borderRadius: 8, ...style }}
				transition={ugoki.spring}
			>
				{children}
			</motion.span>
		</ReducedMotion>
	)
}
