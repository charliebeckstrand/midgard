'use client'

import type { Placement } from '@floating-ui/react'
import type { ReactNode } from 'react'
import type { Step } from '../../recipes'
import { TooltipContext } from './context'
import { useTooltipState } from './use-tooltip-state'

export type TooltipProps = {
	placement?: Placement
	delay?: number
	interactive?: boolean
	enabled?: boolean
	/**
	 * Size step applied to the tooltip content. Forwarded via context to
	 * `<TooltipContent>`; an explicit `size` there still wins. When unset,
	 * content falls back to the enclosing Density size, then `'md'`.
	 */
	size?: Step
	className?: string
	children: ReactNode
}

/**
 * Hover/focus tooltip root; wires up floating state and shares `placement`,
 * `delay`, and `size` with its `<TooltipTrigger>` and `<TooltipContent>` via
 * context.
 */
export function Tooltip({ children, ...props }: TooltipProps) {
	const contextValue = useTooltipState(props)

	return <TooltipContext value={contextValue}>{children}</TooltipContext>
}
