'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { ControlFrame } from '../../primitives/control'

type InputFrameProps = {
	input: ReactNode
	prefix: ReactNode
	suffix: ReactNode
	/** The slots of the unit: the frame (`base`) and the affix slots. */
	slots: { readonly base: string; readonly prefix: string; readonly suffix: string }
	/** The `size` of the input. A step makes the frame a density scope. */
	density?: DensityStep
}

/**
 * Whether an affix renders. A null, false, or `''` affix is absent, so the
 * frame gets no affix style and no empty slot. A `0` affix is present, and a
 * plain `&&` would leak it as a bare text node.
 *
 * @internal
 */
export function isAffixPresent(affix: ReactNode) {
	return affix != null && affix !== false && affix !== ''
}

/**
 * Density-scoped affix frame around the bare `<input>`. Each prefix and suffix
 * slot is a scope one step below the frame (`data-density="slot"`), so the slot
 * content renders one step smaller than the input. The caller resolves the
 * slots of its unit, with `affixed` from {@link isAffixPresent}, which also
 * guards each affix here.
 *
 * @internal
 */
export function InputFrame({ input, prefix, suffix, slots, density }: InputFrameProps) {
	const hasPrefix = isAffixPresent(prefix)

	const hasSuffix = isAffixPresent(suffix)

	return (
		<ControlFrame density={density} className={cn(slots.base)}>
			{hasPrefix && (
				<span data-slot="prefix" data-density="slot" className={cn(slots.prefix)}>
					{prefix}
				</span>
			)}

			{input}

			{hasSuffix && (
				<span data-slot="suffix" data-density="slot" className={cn(slots.suffix)}>
					{suffix}
				</span>
			)}
		</ControlFrame>
	)
}
