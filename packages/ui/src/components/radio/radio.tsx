'use client'

import { cn } from '../../core'
import { kokkaku } from '../../recipes'
import { useControl } from '../control/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type RadioVariants, radioInputVariants, radioVariants } from './variants'

export type RadioProps = RadioVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Radio({ className, color, id, disabled, required, ...props }: RadioProps) {
	const control = useControl()

	const resolvedId = id ?? control?.id

	const resolvedDisabled = disabled ?? control?.disabled
	const resolvedRequired = required ?? control?.required

	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.radio.base, className)} />
	}

	return (
		<label data-slot="control" className={cn(radioVariants({ color }), className)}>
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
				className="absolute size-1.5 rounded-full bg-(--radio-checked-indicator) opacity-0 pointer-events-none"
			/>
		</label>
	)
}
