'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useSkeleton } from '../../providers/skeleton'
import { k, type RadioVariants } from '../../recipes/kata/radio'
import { useControlToggle } from '../control/use-control-toggle'
import { RadioSkeleton } from './radio-skeleton'

export type RadioProps = RadioVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

/** Single radio control wrapped in its label — id, disabled, required, and invalid state resolve from the enclosing control group. */
export function Radio({
	className,
	color,
	size,
	id,
	disabled,
	required,
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

	if (useSkeleton()) {
		return <RadioSkeleton className={className} />
	}

	return (
		<label
			data-slot="control"
			{...(resolvedDisabled ? { 'data-disabled': true } : {})}
			className={cn(k({ color, size: resolvedSize }), className)}
		>
			<input
				type="radio"
				data-slot="radio"
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
