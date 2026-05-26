'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useSkeleton } from '../../providers/skeleton'
import { k, type RadioVariants } from '../../recipes/kata/radio'
import { useControlToggle } from '../control/use-control-toggle'
import { Placeholder } from '../placeholder'

export type RadioProps = RadioVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

export function Radio({ className, color, size, id, disabled, required, ...props }: RadioProps) {
	const {
		id: resolvedId,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		invalid: resolvedInvalid,
		size: resolvedSize,
	} = useControlToggle({ id, disabled, required, size })

	if (useSkeleton()) {
		return <Placeholder className={cn(k.skeleton.base, className)} />
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
				{...invalidAttrs(resolvedInvalid)}
				className={k.input()}
				{...props}
			/>
			<span
				data-slot="radio-indicator"
				aria-hidden="true"
				className={cn(
					'absolute rounded-full bg-(--radio-checked-indicator) opacity-0 pointer-events-none',
					k.indicatorSize[resolvedSize],
				)}
			/>
		</label>
	)
}
