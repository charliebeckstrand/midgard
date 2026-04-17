'use client'

import { cn } from '../../core'
import { ToggleField, ToggleGroup } from '../../primitives'
import { kokkaku } from '../../recipes'
import { useControl } from '../control/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import {
	k,
	type RadioVariants,
	radioColorVariants,
	radioInputVariants,
	radioVariants,
} from './variants'

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
		<label
			data-slot="control"
			className={cn(k.wrapper, radioVariants(), radioColorVariants({ color }), className)}
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
				className="absolute size-1.5 rounded-full bg-(--radio-checked-indicator) opacity-0 pointer-events-none"
			/>
		</label>
	)
}

export type RadioGroupProps = React.ComponentPropsWithoutRef<'div'>

export function RadioGroup(props: RadioGroupProps) {
	return <ToggleGroup role="radiogroup" {...props} />
}

export type RadioFieldProps = React.ComponentPropsWithoutRef<'div'>

export function RadioField({ className, ...props }: RadioFieldProps) {
	return <ToggleField className={cn(k.disabled, className)} {...props} />
}
