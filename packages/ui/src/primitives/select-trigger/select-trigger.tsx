'use client'

import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn, dataAttr } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/select'
import { AffixContext, affixStepDown } from '../affix'
import { ControlFrame } from '../control'

type SelectTriggerProps = {
	open: boolean
	setReference: Ref<HTMLDivElement>
	getReferenceProps: () => Record<string, unknown>
	glass: boolean
	size: Step
	prefix?: ReactNode
	/** Suffix rendered inside the standard `<span data-slot="suffix">` slot. */
	suffix?: ReactNode
	/** Props spread onto the suffix `<span>` slot; Combobox makes the chevron a click target here. */
	suffixProps?: Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'children'>
	className?: string
	frameProps?: Omit<ComponentPropsWithoutRef<typeof ControlFrame>, 'className' | 'children'>
	'data-group'?: string
	'data-group-orientation'?: string
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
 * Wraps its subtree in `AffixContext` set to `affixStepDown(size)`, so
 * affix-aware descendants (the chevron and prefix/suffix icons) render one
 * notch tighter than the trigger. Client component (`'use client'`).
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
		<AffixContext value={affixStepDown(size)}>
			<div data-slot={slot} ref={setReference} className={cn(className)} {...getReferenceProps()}>
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
							className={cn('peer/prefix', k.affix.base, k.affix.prefix[size])}
						>
							{prefix}
						</span>
					)}
					{children}
					{suffix !== undefined && (
						<span
							data-slot="suffix"
							className={cn('peer/suffix', k.affix.base, k.affix.suffix[size])}
							{...suffixProps}
						>
							{suffix}
						</span>
					)}
				</ControlFrame>
			</div>
		</AffixContext>
	)
}
