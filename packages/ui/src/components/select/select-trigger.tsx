'use client'

import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn } from '../../core'
import { AffixProvider, affixStepDown } from '../../primitives/affix'
import { ControlFrame } from '../../primitives/control'
import { iro, sawari } from '../../recipes'
import { control as controlRecipe } from '../../recipes/genkei/control'
import type { ControlSize } from '../control/context'

const affixBase = [
	'flex items-center min-w-0',
	'*:data-[slot=icon]:pointer-events-none',
	...iro.text.muted,
	...sawari.cursor,
]

export type SelectTriggerProps = {
	open: boolean
	setReference: Ref<HTMLDivElement>
	getReferenceProps: () => Record<string, unknown>
	glass: boolean
	size: ControlSize
	prefix?: ReactNode
	/** Suffix rendered inside the standard `<span data-slot="suffix">` slot. */
	suffix?: ReactNode
	/** Props spread onto the suffix `<span>` slot — used by Combobox to make the chevron a click target. */
	suffixProps?: Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'children'>
	className?: string
	frameProps?: Omit<ComponentPropsWithoutRef<typeof ControlFrame>, 'className' | 'children'>
	'data-group'?: string
	'data-group-orientation'?: string
	children: ReactNode
}

/**
 * Internal trigger chrome shared by Combobox and Listbox: the outer control
 * wrapper, the ControlFrame surface, and the prefix/suffix slot spans. The
 * interactive element (input vs button) and any non-wrapped suffix content
 * are supplied by the caller.
 *
 * Not exported from the package barrel — intentionally internal.
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
	children,
}: SelectTriggerProps) {
	return (
		<AffixProvider value={affixStepDown(size)}>
			<div
				data-slot="control"
				ref={setReference}
				className={cn(className)}
				{...getReferenceProps()}
			>
				<ControlFrame
					data-open={open || undefined}
					data-group={dataGroup}
					data-group-orientation={dataGroupOrientation}
					className={cn(!glass && controlRecipe.surface.default)}
					{...frameProps}
				>
					{prefix && (
						<span
							data-slot="prefix"
							className={cn('peer/prefix', affixBase, controlRecipe.affix.prefix[size])}
						>
							{prefix}
						</span>
					)}
					{children}
					{suffix !== undefined && (
						<span
							data-slot="suffix"
							className={cn('peer/suffix', affixBase, controlRecipe.affix.suffix[size])}
							{...suffixProps}
						>
							{suffix}
						</span>
					)}
				</ControlFrame>
			</div>
		</AffixProvider>
	)
}
