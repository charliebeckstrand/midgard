'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { AffixContext, affixStepDown } from '../../primitives/affix'
import { ControlFrame } from '../../primitives/control'
import { DensityScope } from '../../primitives/density'
import type { Step } from '../../recipes'
import { type InputVariants, k } from '../../recipes/kata/input'

type InputFrameProps = {
	inputEl: ReactNode
	prefix: ReactNode
	suffix: ReactNode
	variant: InputVariants['variant']
	/** Density space axis, indexing the prefix / suffix slot padding. */
	space: Step
	/** Resolved size; drives the stepped-down affix broadcast. */
	size: Step
	/** Raw `size` prop, opening a density scope when set. */
	scale?: Step
	dataGroup?: string
	dataGroupOrientation?: string
}

/**
 * Density-scoped affix frame around the bare `<input>`. One definition of
 * "present" for both the wrapper class and the render guards: a null/false
 * affix styles the frame while rendering nothing, and `0` would leak as a bare
 * text node through a plain `&&`.
 */
export function InputFrame({
	inputEl,
	prefix,
	suffix,
	variant,
	space,
	size,
	scale,
	dataGroup,
	dataGroupOrientation,
}: InputFrameProps) {
	const hasPrefix = prefix != null && prefix !== false

	const hasSuffix = suffix != null && suffix !== false

	const hasAffix = hasPrefix || hasSuffix

	return (
		<DensityScope scale={scale}>
			<AffixContext value={affixStepDown(size)}>
				<ControlFrame
					data-group={dataGroup}
					data-group-orientation={dataGroupOrientation}
					className={cn(
						k.inputControl({ variant }),
						hasAffix && 'group/control flex flex-wrap items-center',
					)}
				>
					{hasPrefix && (
						<span data-slot="prefix" className={cn('peer/prefix', k.affix, k.prefix[space])}>
							{prefix}
						</span>
					)}

					{inputEl}

					{hasSuffix && (
						<span data-slot="suffix" className={cn(k.affix, k.suffix[space])}>
							{suffix}
						</span>
					)}
				</ControlFrame>
			</AffixContext>
		</DensityScope>
	)
}
