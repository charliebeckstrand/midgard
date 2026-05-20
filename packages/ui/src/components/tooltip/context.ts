'use client'

import type { CSSProperties } from 'react'
import { createContext } from '../../core'
import type { Step } from '../../core/recipe'

type TooltipContextValue = {
	open: boolean
	interactive: boolean
	enabled: boolean
	size?: Step
	className?: string
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getReferenceProps: (userProps?: object) => Record<string, unknown>
	getFloatingProps: (userProps?: object) => Record<string, unknown>
}

export const [TooltipProvider, useTooltipContext] = createContext<TooltipContextValue>('Tooltip')
