'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useDensity } from '../../primitives/density'
import { useSkeleton } from '../../providers/skeleton'
import { kokkaku } from '../../recipes'
import {
	indicatorSize,
	type RadioVariants,
	k as radio,
	input as radioInput,
} from '../../recipes/kata/radio'
import { useControlProps } from '../control/use-control-props'
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
	} = useControlProps({ id, disabled, required })

	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.radio.base, className)} />
	}

	return (
		<label
			data-slot="control"
			{...(resolvedDisabled ? { 'data-disabled': true } : {})}
			className={cn(radio({ color, size: resolvedSize }), className)}
		>
			<input
				type="radio"
				data-slot="radio"
				id={resolvedId}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				{...invalidAttrs(resolvedInvalid)}
				className={radioInput()}
				{...props}
			/>
			<span
				data-slot="radio-indicator"
				aria-hidden="true"
				className={cn(
					'absolute rounded-full bg-(--radio-checked-indicator) opacity-0 pointer-events-none',
					indicatorSize[resolvedSize],
				)}
			/>
		</label>
	)
}
