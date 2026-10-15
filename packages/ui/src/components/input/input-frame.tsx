'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { ControlFrame } from '../../primitives/control'
import { type InputVariants, k } from '../../recipes/kata/input'

type InputFrameProps = {
	input: ReactNode
	prefix: ReactNode
	suffix: ReactNode
	variant: InputVariants['variant']
	/** The `size` of the input. A step makes the frame a density scope. */
	density?: DensityStep
}

/**
 * Density-scoped affix frame around the bare `<input>`. Each prefix and suffix
 * slot is a scope one step below the frame (`data-density="slot"`), so the slot
 * content renders one step smaller than the input. One definition of
 * "present" serves both the wrapper class and the render guards. A null,
 * false, or `''` affix is absent. Without this test, it styles the frame and
 * renders an empty slot. A `0` affix is present, and a plain `&&` would leak it
 * as a bare text node.
 *
 * @internal
 */
export function InputFrame({ input, prefix, suffix, variant, density }: InputFrameProps) {
	const hasPrefix = prefix != null && prefix !== false && prefix !== ''

	const hasSuffix = suffix != null && suffix !== false && suffix !== ''

	const hasAffix = hasPrefix || hasSuffix

	return (
		<ControlFrame density={density} className={cn(k.surface({ variant }), hasAffix && k.frame)}>
			{hasPrefix && (
				<span data-slot="prefix" data-density="slot" className={cn(k.affix.base, k.affix.prefix)}>
					{prefix}
				</span>
			)}

			{input}

			{hasSuffix && (
				<span data-slot="suffix" data-density="slot" className={cn(k.affix.base, k.affix.suffix)}>
					{suffix}
				</span>
			)}
		</ControlFrame>
	)
}
