'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/control'
import { useDensity } from '../density'

/** Props for {@link ControlFrame}: the standard `span` attributes. */
export type ControlFrameProps = ComponentPropsWithoutRef<'span'>

/**
 * Outer chrome wrapper providing shared focus ring, border, and disabled state for form inputs.
 *
 * @remarks
 * Client-tier: reads ambient Density via `useDensity` to scale its corner
 * radius off the resolved `space` step. Static hosts pass size explicitly and
 * never compose it (REFERENCE §2).
 * @see {@link useDensity}
 */
export function ControlFrame({ className, ...props }: ControlFrameProps) {
	const { space } = useDensity()

	return (
		<span
			data-slot="control-frame"
			className={cn(k.frame, k.frameRadius[space], className)}
			{...props}
		/>
	)
}
