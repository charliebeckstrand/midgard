'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/control'
import { useDensity } from '../density'

type ControlFrameProps = ComponentPropsWithoutRef<'span'>

/** Outer chrome wrapper providing shared focus ring, border, and disabled state for form inputs. */
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
