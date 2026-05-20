'use client'

import type { Placement } from '@floating-ui/react'
import type { ReactNode } from 'react'
import type { Step } from '../../recipes'
import { TooltipProvider } from './context'
import { useTooltipState } from './use-tooltip-state'

export type TooltipProps = {
	placement?: Placement
	delay?: number
	interactive?: boolean
	enabled?: boolean
	/**
	 * Size step applied to the tooltip content. Forwarded via context so
	 * setting it once on `<Tooltip>` styles its `<TooltipContent>` without
	 * threading the prop through children. An explicit `size` on
	 * `<TooltipContent>` still wins. When unset, content falls back to the
	 * enclosing Density size, then `'md'`.
	 */
	size?: Step
	className?: string
	children: ReactNode
}

export function Tooltip({ children, ...props }: TooltipProps) {
	const contextValue = useTooltipState(props)

	return <TooltipProvider value={contextValue}>{children}</TooltipProvider>
}
