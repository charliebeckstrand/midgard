'use client'

import type { ComponentProps, ReactNode, Ref } from 'react'
import { cn, dataAttr } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/select'
import type { GroupStampProps } from '../../types/group-stamp'
import { ControlFrame } from '../control'
import { Density, DensitySlot } from '../density'

/**
 * Props for {@link SelectTrigger}: the floating-reference wiring the caller
 * owns (`open`, `setReference`, `getReferenceProps`), the `glass` / `size`
 * presentation, and the prefix / suffix slot content.
 */
export type SelectTriggerProps = GroupStampProps & {
	open: boolean
	setReference: Ref<HTMLDivElement>
	getReferenceProps: () => Record<string, unknown>
	glass: boolean
	/** The explicit `size` of the host. It opens a density scope on the trigger. */
	size?: Step
	prefix?: ReactNode
	/** Suffix rendered inside the standard `<span data-slot="suffix">` slot. */
	suffix?: ReactNode
	/** Props spread onto the suffix `<span>` slot; Combobox makes the chevron a click target here. */
	suffixProps?: Omit<ComponentProps<'span'>, 'className' | 'children'>
	className?: string
	frameProps?: Omit<ComponentProps<typeof ControlFrame>, 'className' | 'children'>
	/** Root slot identifier. Wrappers override it to stamp their own name. */
	'data-slot'?: string
	children: ReactNode
}

/**
 * Trigger chrome shared by the select family (Listbox, Combobox): the outer
 * control wrapper, the ControlFrame surface, and the prefix/suffix slot spans.
 * The interactive element (input vs button) and any non-wrapped suffix content
 * are supplied by the caller.
 *
 * A presentational primitive; it owns no state.
 *
 * @remarks
 * The trigger takes the step of its nearest density scope, and an explicit
 * `size` writes that scope on the root. Each prefix and suffix slot is a scope
 * one step below the trigger (`data-density="slot"`). Thus the chevron and the
 * other slot content render one step smaller than the trigger. Client
 * component (`'use client'`).
 */
export function SelectTrigger({
	open,
	setReference,
	getReferenceProps,
	glass,
	size,
	prefix,
	suffix,
	suffixProps,
	className,
	frameProps,
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
	'data-slot': slot = 'control',
	children,
}: SelectTriggerProps) {
	return (
		<div
			data-slot={slot}
			data-density={size}
			ref={setReference}
			className={cn(className)}
			{...getReferenceProps()}
		>
			<Density step={size}>
				<ControlFrame
					data-open={dataAttr(open)}
					data-group={dataGroup}
					data-group-orientation={dataGroupOrientation}
					className={cn(!glass && k.surface.default)}
					{...frameProps}
				>
					{prefix && (
						<span
							data-slot="prefix"
							data-density="slot"
							className={cn(k.affix.base, k.affix.prefix)}
						>
							<DensitySlot>{prefix}</DensitySlot>
						</span>
					)}
					{children}
					{suffix !== undefined && (
						<span
							data-slot="suffix"
							data-density="slot"
							className={cn('peer/suffix', k.affix.base, k.affix.suffix)}
							{...suffixProps}
						>
							<DensitySlot>{suffix}</DensitySlot>
						</span>
					)}
				</ControlFrame>
			</Density>
		</div>
	)
}
