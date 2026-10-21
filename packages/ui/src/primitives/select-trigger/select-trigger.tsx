'use client'

import { useComposedRefs } from 'motion/react'
import type { ComponentProps, ReactNode, Ref } from 'react'
import { cn, dataAttr } from '../../core'
import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/control'
import { ControlFrame } from '../control'
import { PolymorphicStatic } from '../polymorphic'

/**
 * Props for {@link SelectTrigger}: the floating-reference wiring the caller
 * owns (`open`, `setReference`, `getReferenceProps`), the `slots` / `size`
 * presentation, and the prefix / suffix slot content. The root `<div>` takes
 * the rest. The floating interactions compose their handlers with the handlers
 * of the rest.
 */
export type SelectTriggerProps = Omit<ComponentProps<'div'>, 'prefix' | 'children'> & {
	open: boolean
	setReference: Ref<HTMLDivElement>
	getReferenceProps: (userProps?: Record<string, unknown>) => Record<string, unknown>
	/**
	 * The classes of the frame and of the affix slots: the `base`, `prefix`, and
	 * `suffix` slots of the unit of the control, such as `k({ variant }).base`.
	 */
	slots: { readonly base: string; readonly prefix: string; readonly suffix: string }
	/**
	 * The density step of the host. Omit it to take the step of the nearest
	 * density scope. A step makes the trigger a density scope.
	 */
	size?: ScaleStep<typeof scale>
	prefix?: ReactNode
	/** Suffix rendered inside the standard `<span data-slot="suffix">` slot. */
	suffix?: ReactNode
	/** Props spread onto the suffix `<span>` slot; Combobox makes the chevron a click target here. */
	suffixProps?: Omit<ComponentProps<'span'>, 'className' | 'children'>
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
	slots,
	size,
	prefix,
	suffix,
	suffixProps,
	className,
	frameProps,
	ref,
	'data-slot': slot = 'control',
	children,
	...props
}: SelectTriggerProps) {
	// The floating reference reads the node, so a consumer `ref` joins it.
	const setRoot = useComposedRefs(setReference, ref)

	return (
		<PolymorphicStatic
			as="div"
			data-slot={slot}
			{...props}
			// The floating interactions come after the rest, and they compose each
			// handler of the rest with their own.
			{...getReferenceProps(props)}
			density={size}
			ref={setRoot}
			className={cn(className)}
		>
			<ControlFrame data-open={dataAttr(open)} className={cn(slots.base)} {...frameProps}>
				{prefix && (
					<span data-slot="prefix" data-density="slot" className={cn(slots.prefix)}>
						{prefix}
					</span>
				)}
				{children}
				{suffix !== undefined && (
					<span
						data-slot="suffix"
						data-density="slot"
						className={cn('peer/suffix', slots.suffix)}
						{...suffixProps}
					>
						{suffix}
					</span>
				)}
			</ControlFrame>
		</PolymorphicStatic>
	)
}
