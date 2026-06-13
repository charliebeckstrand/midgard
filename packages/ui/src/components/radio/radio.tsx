'use client'

import type { ComponentPropsWithoutRef, Ref } from 'react'
import { cn, invalidAttrs } from '../../core'
import { k, type RadioVariants } from '../../recipes/kata/radio'
import { useControlToggle } from '../control/use-control-toggle'

/** Props for {@link Radio}: recipe `color`/`size` plus native `<input>` attributes (less `type`/`size`). */
export type RadioProps = RadioVariants & {
	className?: string
	ref?: Ref<HTMLInputElement>
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

/** Single radio control wrapped in its label; id, disabled, required, and invalid state resolve from the enclosing control group. */
export function Radio({
	className,
	color,
	size,
	id,
	disabled,
	required,
	ref,
	'aria-describedby': ariaDescribedBy,
	...props
}: RadioProps) {
	const {
		id: resolvedId,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		invalid: resolvedInvalid,
		size: resolvedSize,
		'aria-describedby': resolvedDescribedBy,
	} = useControlToggle({ id, disabled, required, size, 'aria-describedby': ariaDescribedBy })

	return (
		<label
			data-slot="control"
			{...(resolvedDisabled ? { 'data-disabled': true } : {})}
			className={cn(k({ color, size: resolvedSize }), className)}
		>
			<input
				type="radio"
				data-slot="radio"
				ref={ref}
				id={resolvedId}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				aria-describedby={resolvedDescribedBy}
				{...invalidAttrs(resolvedInvalid)}
				className={k.input()}
				{...props}
			/>
			<span
				data-slot="radio-indicator"
				aria-hidden="true"
				className={cn(
					'absolute rounded-full bg-(--check-mark) opacity-0 pointer-events-none',
					k.indicatorSize[resolvedSize],
				)}
			/>
		</label>
	)
}
