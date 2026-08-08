'use client'

import { LayoutGroup, type MotionStyle, motion, useAnimate } from 'motion/react'
import { type ReactNode, type Ref, useCallback, useId, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { k } from '../../recipes/kata/active-indicator'
import { ReducedMotion } from '../reduced-motion'

// Default indicator corner radius (px). Kept inline (not a Tailwind class) so
// Motion's layout projection can apply inverse-scale correction to it during
// the shared-element morph.
const INDICATOR_RADIUS = 8

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
 * @remarks Wraps the group in {@link ReducedMotion} so the morph degrades to a
 * fade under `prefers-reduced-motion`.
 * @see {@link useActiveIndicatorScope}
 */
export function ActiveIndicatorScope({ children }: { children: ReactNode }) {
	const scopeId = useId()

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
 * transition. Resolves its morph-scope id from the nearest
 * {@link ActiveIndicatorScope}, falling back to the global `'current-indicator'`.
 *
 * @remarks Decorative (`pointer-events-none`): it paints behind the item and
 * never intercepts presses. Defaults to an `8px` corner radius, set inline so
 * Motion's layout projection can inverse-scale it mid-morph.
 * @see {@link ActiveIndicatorScope}
 */
export function ActiveIndicator({
	ref,
	className,
	style,
}: {
	ref?: Ref<HTMLSpanElement>
	className?: string
	style?: MotionStyle
}) {
	const scopedLayoutId = useActiveIndicatorScope()

	const resolvedLayoutId = scopedLayoutId ?? 'current-indicator'

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
				className={cn(
					'pointer-events-none absolute inset-0',
					'bg-zinc-200 dark:bg-zinc-700',
					className,
				)}
				// Motion's layout projection applies inverse-scale correction to inline
				// `borderRadius` during the shared-element transition.
				style={{ borderRadius: INDICATOR_RADIUS, ...style }}
				transition={k.spring}
			/>
		</ReducedMotion>
	)
}
