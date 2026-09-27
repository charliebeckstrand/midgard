'use client'

import type { ReactNode } from 'react'
import { cn, stepDown } from '../../core'
import { ControlFrame } from '../../primitives/control'
import { Density } from '../../primitives/density'
import type { Step } from '../../recipes'
import { type InputVariants, k } from '../../recipes/kata/input'

type InputFrameProps = {
	inputEl: ReactNode
	prefix: ReactNode
	suffix: ReactNode
	variant: InputVariants['variant']
	/** Resolved step: the prefix / suffix slot padding. Each slot is a scope one step below it. */
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

	const slotStep = stepDown(size)

	return (
		<Density step={scope}>
			<ControlFrame
				data-density={scope}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
				className={cn(k.inputControl({ variant }), hasAffix && k.frame)}
			>
				{hasPrefix && (
					<span data-slot="prefix" data-density={slotStep} className={cn(k.affix, k.prefix[size])}>
						<Density step={slotStep}>{prefix}</Density>
					</span>
				)}

				{inputEl}

				{hasSuffix && (
					<span data-slot="suffix" data-density={slotStep} className={cn(k.affix, k.suffix[size])}>
						<Density step={slotStep}>{suffix}</Density>
					</span>
				)}
			</ControlFrame>
		</Density>
	)
}
