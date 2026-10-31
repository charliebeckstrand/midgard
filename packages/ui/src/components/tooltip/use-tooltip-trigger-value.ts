'use client'

import { useMemo } from 'react'
import type { TooltipContextValue, TooltipTriggerValue } from './context'

/**
 * The trigger part of the value of a `<Tooltip>`, for
 * `TooltipTriggerContext`. It keeps its identity while the panel moves, so a
 * reposition renders only the panel.
 *
 * @internal
 */
export function useTooltipTriggerValue(value: TooltipContextValue): TooltipTriggerValue {
	const { open, enabled, setReference, getReferenceProps, triggerId } = value

	return useMemo(
		() => ({ open, enabled, setReference, getReferenceProps, triggerId }),
		[open, enabled, setReference, getReferenceProps, triggerId],
	)
}
