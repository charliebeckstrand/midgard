'use client'

import { LayoutGroup, type MotionStyle, motion, useAnimate } from 'motion/react'
import { type ReactNode, type Ref, useCallback, useId, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { k } from '../../recipes/kata/active-indicator'
import { ReducedMotion } from '../reduced-motion'

/**
 * Carries the `LayoutGroup` `layoutId` an `ActiveIndicatorScope` opens, letting
 * descendant `ActiveIndicator`s share one morph scope; `undefined` outside a
 * scope, falling back to the global `'current-indicator'` id.
 *
 * @internal
 */
const [ActiveIndicatorScopeContext, useActiveIndicatorScope] = createContext<string | undefined>(
	'ActiveIndicatorScope',
	{ default: undefined },
)

/**
 * Scopes active indicators to a single nav / tab group, wrapping children in a
 * Motion `LayoutGroup` so descendant {@link ActiveIndicator}s morph against each
 * other rather than against indicators in sibling groups.
 *
 * @param id - Explicit scope id; defaults to a generated `useId` value.
 * @remarks Wraps the group in {@link ReducedMotion} so the morph degrades to a
 * fade under `prefers-reduced-motion`.
 * @see {@link useActiveIndicatorScope}
 */
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

/**
 * Wires the press-feedback animation for an active-indicator host.
 *
 * @returns A `ref` to attach to the indicator span and `tapHandlers` (pointer
 * down/up/leave) for the parent container; press dips the indicator to `0.99`
 * scale and releases it back to `1` on the shared spring.
 * @see {@link ActiveIndicator}
 */
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
				className={cn('absolute inset-0', 'bg-zinc-200 dark:bg-zinc-700', className)}
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
