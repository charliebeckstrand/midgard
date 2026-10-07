'use client'

import { memo, type ReactNode, useLayoutEffect } from 'react'
import { TooltipContext, type TooltipContextValue } from './context'
import { type TooltipStateOptions, useTooltipState } from './use-tooltip-state'

/** Props for {@link TooltipStateRoot}. @internal */
export type TooltipStateRootProps = TooltipStateOptions & { children: ReactNode }

/**
 * Runs {@link useTooltipState} for a `<Tooltip>` that mounts after the module
 * loaded, and shares the state through context. It is the tree of a tooltip
 * with no lazy state: one render on mount, and no handover.
 * @internal
 */
export function TooltipStateRoot({ children, ...options }: TooltipStateRootProps) {
	const value = useTooltipState(options)

	return <TooltipContext value={value}>{children}</TooltipContext>
}

/** Props for {@link TooltipStateHost}. @internal */
export type TooltipStateHostProps = TooltipStateOptions & {
	/** Receives each new value of the tooltip state. */
	onState: (value: TooltipContextValue) => void
}

/**
 * Runs {@link useTooltipState} for a `<Tooltip>` and gives each value to the
 * root, which shares it through context. It renders nothing. The root renders
 * it beside its children when the module loads, so the children keep their
 * place in the tree and do not mount again.
 *
 * @remarks The host is memoized. The root renders again for each value that
 * the host gives, with the same props, and the memo stops that render at the
 * host.
 * @internal
 */
export const TooltipStateHost = memo(function TooltipStateHost({
	onState,
	...options
}: TooltipStateHostProps) {
	const value = useTooltipState(options)

	// Before paint, so the root shares the value in the same commit.
	useLayoutEffect(() => {
		onState(value)
	}, [onState, value])

	return null
})
