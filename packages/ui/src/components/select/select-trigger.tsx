'use client'

import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn } from '../../core'
import { AffixProvider, affixStepDown } from '../../primitives/affix'
import { ControlFrame } from '../../primitives/control'
import { iro, sawari } from '../../recipes'
import { control as controlRecipe } from '../../recipes/waku/control'
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
	/** Escape hatch for suffixes that must be a top-level focus target inside the ControlFrame (e.g. Combobox's interactive chevron Button). */
	suffixUnwrapped?: ReactNode
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
	suffixUnwrapped,
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
					{suffixUnwrapped ??
						(suffix !== undefined && (
							<span
								data-slot="suffix"
								className={cn('peer/suffix', affixBase, controlRecipe.affix.suffix[size])}
							>
								{suffix}
							</span>
						))}
				</ControlFrame>
			</div>
		</AffixProvider>
	)
}
