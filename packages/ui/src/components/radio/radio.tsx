'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { kokkaku } from '../../recipes'
import { useConcentric } from '../concentric'
import { useControl } from '../control/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import {
	type RadioVariants,
	radioIndicatorSize,
	radioInputVariants,
	radioVariants,
} from './variants'

export type RadioProps = RadioVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

export function Radio({ className, color, size, id, disabled, required, ...props }: RadioProps) {
	const concentric = useConcentric()
	const control = useControl()

	const resolvedId = id ?? control?.id

	const resolvedDisabled = disabled ?? control?.disabled
	const resolvedRequired = required ?? control?.required
	const resolvedSize = size ?? concentric?.size ?? 'md'

	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.radio.base, className)} />
	}

	return (
		<label
			data-slot="control"
			className={cn(radioVariants({ color, size: resolvedSize }), className)}
		>
			<input
				type="radio"
				data-slot="radio"
				id={resolvedId}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				{...(control?.invalid ? { 'data-invalid': '', 'aria-invalid': true } : {})}
				className={radioInputVariants()}
				{...props}
			/>
			<span
				data-slot="radio-indicator"
				aria-hidden="true"
				className={cn(
					'absolute rounded-full bg-(--radio-checked-indicator) opacity-0 pointer-events-none',
					radioIndicatorSize[resolvedSize],
				)}
			/>
		</label>
	)
}
