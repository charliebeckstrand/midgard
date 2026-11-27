'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core/cn'
import type { DensityStep } from '../../core/density/steps'
import { ControlFrame } from '../../primitives/control'
import { HeadlessShell } from '../../primitives/headless/headless-shell'
import { hasContent } from '../../utilities/children'

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
 * Density-scoped affix frame around the bare `<input>`. Each prefix and suffix
 * slot is a scope one step below the frame (`data-density="slot"`), so the slot
 * content renders one step smaller than the input. The caller resolves the
 * slots of its unit, with `affixed` from {@link hasContent}, which also
 * guards each affix here. Under `<HeadlessProvider>`, the frame and each affix
 * slot drop their element, and the affixes render bare beside the field.
 *
 * @internal
 */
export function InputFrame({ input, prefix, suffix, slots, density }: InputFrameProps) {
	const hasPrefix = hasContent(prefix)

	const hasSuffix = hasContent(suffix)

	return (
		<ControlFrame density={density} className={cn(slots.base)}>
			{hasPrefix && (
				<HeadlessShell data-slot="prefix" data-density="slot" className={cn(slots.prefix)}>
					{prefix}
				</HeadlessShell>
			)}

			{input}

			{hasSuffix && (
				<HeadlessShell data-slot="suffix" data-density="slot" className={cn(slots.suffix)}>
					{suffix}
				</HeadlessShell>
			)}
		</ControlFrame>
	)
}
