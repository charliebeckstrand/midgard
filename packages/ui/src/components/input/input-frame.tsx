'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { ControlFrame } from '../../primitives/control'
import { type InputVariants, k } from '../../recipes/kata/input'

type InputFrameProps = {
	inputEl: ReactNode
	prefix: ReactNode
	suffix: ReactNode
	variant: InputVariants['variant']
	/** The `size` of the input. A step makes the frame a density scope. */
	density?: DensityStep
	dataGroup?: string
	dataGroupOrientation?: string
}

/**
 * Density-scoped affix frame around the bare `<input>`. Each prefix and suffix
 * slot is a scope one step below the frame (`data-density="slot"`), so the slot
 * content renders one step smaller than the input. One definition of
 * "present" serves both the wrapper class and the render guards. A null or
 * false affix styles the frame while rendering nothing, and `0` would leak as a
 * bare text node through a plain `&&`.
 *
 * @internal
 */
export function InputFrame({
	inputEl,
	prefix,
	suffix,
	variant,
	density,
	dataGroup,
	dataGroupOrientation,
}: InputFrameProps) {
	const hasPrefix = prefix != null && prefix !== false

	const hasSuffix = suffix != null && suffix !== false

	const hasAffix = hasPrefix || hasSuffix

	return (
		<ControlFrame
			density={density}
			data-group={dataGroup}
			data-group-orientation={dataGroupOrientation}
			className={cn(k.surface({ variant }), hasAffix && k.frame)}
		>
			{hasPrefix && (
				<span data-slot="prefix" data-density="slot" className={cn(k.affix.base, k.affix.prefix)}>
					{prefix}
				</span>
			)}

			{inputEl}

			{hasSuffix && (
				<span data-slot="suffix" data-density="slot" className={cn(k.affix.base, k.affix.suffix)}>
					{suffix}
				</span>
			)}
		</ControlFrame>
	)
}
