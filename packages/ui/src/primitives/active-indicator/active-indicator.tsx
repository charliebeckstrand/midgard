'use client'

import { LayoutGroup, type MotionStyle, motion, useAnimate } from 'motion/react'
import { type ReactNode, type Ref, useCallback, useId, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { k } from '../../recipes/kata/active-indicator'
import { ReducedMotion } from '../reduced-motion'

const [ActiveIndicatorScopeContext, useActiveIndicatorScope] = createContext<string | undefined>(
	'ActiveIndicatorScope',
	{ default: undefined },
)

/** Scopes active indicators to a single nav / tab group. */
export function ActiveIndicatorScope({ children, id }: { id?: string; children: ReactNode }) {
	const fallbackId = useId()

	const scopeId = id ?? fallbackId

	const layoutId = useMemo(() => `current-indicator-${scopeId}`, [scopeId])

	return (
		<ActiveIndicatorScopeContext value={layoutId}>
			<ReducedMotion>
				<LayoutGroup id={layoutId}>{children}</LayoutGroup>
			</ReducedMotion>
		</ActiveIndicatorScopeContext>
	)
}

/** Animated indicator that morphs between sibling items via layoutId spring physics. Returns a ref and tap handlers for the parent container. */
export function useActiveIndicator() {
	const [scope, animate] = useAnimate<HTMLSpanElement>()

	const onPointerDown = useCallback(() => {
		animate(scope.current, { scale: 0.99 }, k.spring)
	}, [animate, scope])

	const onPointerUp = useCallback(() => {
		animate(scope.current, { scale: 1 }, k.spring)
	}, [animate, scope])

	return {
		ref: scope,
		tapHandlers: { onPointerDown, onPointerUp, onPointerLeave: onPointerUp },
	}
}

/**
 * Visual marker that morphs between sibling items via Motion's shared-element
 * transition. Resolves its `layoutId` from the nearest `ActiveIndicatorScope`.
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

	// Unique per instance, stable across renders. With `layoutDependency`
	// constant, external reflow does not animate the indicator.
	const instanceId = useId()

	return (
		<ReducedMotion>
			<motion.span
				ref={ref}
				data-slot="active-indicator"
				layoutId={resolvedLayoutId}
				layoutDependency={instanceId}
				className={cn('absolute inset-0', 'bg-zinc-300 dark:bg-zinc-600', 'rounded-lg', className)}
				// Motion's layout projection applies inverse-scale correction to inline
				// `borderRadius` during the shared-element transition.
				style={{ borderRadius: 8, ...style }}
				transition={k.spring}
			>
				{children}
			</motion.span>
		</ReducedMotion>
	)
}
