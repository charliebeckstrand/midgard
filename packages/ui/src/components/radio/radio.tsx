'use client'

import type { ComponentPropsWithoutRef, Ref } from 'react'
import { cn } from '../../core'
import { k, type RadioVariants } from '../../recipes/kata/radio'
import { useControlToggle } from '../control/use-control-toggle'

/** Props for {@link Radio}: recipe `color`/`size` plus native `<input>` attributes (less `type`/`size`). */
export type RadioProps = RadioVariants & {
	className?: string
	ref?: Ref<HTMLInputElement>
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

/**
 * Single radio control wrapped in its label; id, disabled, required, and
 * invalid state resolve from the enclosing Control and Density context.
 *
 * @remarks Unlike {@link Checkbox} and {@link Switch}, this binds no Form
 * field: it has no internal checked state and stays a native input controlled
 * by `checked`/`defaultChecked` and a shared `name`. Group radios with
 * {@link RadioGroup} and a common `name` for single-selection.
 */
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
		validation,
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
				{...validation}
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
