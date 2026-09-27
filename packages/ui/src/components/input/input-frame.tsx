'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { AffixContext, affixStepDown } from '../../primitives/affix'
import { ControlFrame } from '../../primitives/control'
import { Density } from '../../primitives/density'
import type { Step } from '../../recipes'
import { type InputVariants, k } from '../../recipes/kata/input'

type InputFrameProps = {
	inputEl: ReactNode
	prefix: ReactNode
	suffix: ReactNode
	variant: InputVariants['variant']
	/** Resolved step: the prefix / suffix slot padding and the stepped-down affix broadcast. */
	size: Step
	/** Raw `size` prop, opening a density scope when set. */
	scope?: Step
	dataGroup?: string
	dataGroupOrientation?: string
}

/**
 * Density-scoped affix frame around the bare `<input>`. One definition of
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
	size,
	scope,
	dataGroup,
	dataGroupOrientation,
}: InputFrameProps) {
	const hasPrefix = prefix != null && prefix !== false

	const hasSuffix = suffix != null && suffix !== false

	const hasAffix = hasPrefix || hasSuffix

	return (
		<Density step={scope}>
			<AffixContext value={affixStepDown(size)}>
				<ControlFrame
					data-group={dataGroup}
					data-group-orientation={dataGroupOrientation}
					className={cn(k.inputControl({ variant }), hasAffix && k.frame)}
				>
					{hasPrefix && (
						<span data-slot="prefix" className={cn(k.affix, k.prefix[size])}>
							{prefix}
						</span>
					)}

					{inputEl}

					{hasSuffix && (
						<span data-slot="suffix" className={cn(k.affix, k.suffix[size])}>
							{suffix}
						</span>
					)}
				</ControlFrame>
			</AffixContext>
		</Density>
	)
}
