'use client'

import type { ComponentProps } from 'react'
import { cn, toAmbientStep } from '../../core'
import { k } from '../../recipes/kata/control'
import { useDensityStep } from '../density'

/** Props for {@link ControlFrame}: the standard `span` attributes. */
export type ControlFrameProps = ComponentProps<'span'>

/**
 * Outer chrome wrapper providing shared focus ring, border, and disabled state for form inputs.
 *
 * @remarks
 * Client-tier: reads the density step through `useDensityStep` to scale its
 * corner radius. Static hosts pass size explicitly and never compose it
 * (REFERENCE §2).
 * @see {@link useDensityStep}
 */
export function ControlFrame({ className, ...props }: ControlFrameProps) {
	const step = toAmbientStep(useDensityStep())

	return (
		<span
			data-slot="control-frame"
			className={cn(k.frame.base, k.frame.radius[step], className)}
			{...props}
		/>
	)
}
