'use client'

import { Check } from 'lucide-react'
import { cn } from '../../core'
import { ToggleField, ToggleGroup } from '../../primitives'
import { katachi, kokkaku } from '../../recipes'
import { useControl } from '../control/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import {
	type CheckboxVariants,
	checkboxColorVariants,
	checkboxInputVariants,
	checkboxVariants,
} from './variants'

const k = katachi.checkbox

export type CheckboxProps = CheckboxVariants & {
	icon?: React.ReactNode
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Checkbox({
	className,
	color,
	icon,
	id,
	disabled,
	required,
	...props
}: CheckboxProps) {
	const control = useControl()

	const resolvedId = id ?? control?.id
	const resolvedDisabled = disabled ?? control?.disabled
	const resolvedRequired = required ?? control?.required

	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.checkbox.base, className)} />
	}

	return (
		<label
			data-slot="control"
			className={cn(k.wrapper, checkboxVariants(), checkboxColorVariants({ color }))}
		>
			<input
				type="checkbox"
				data-slot="checkbox"
				id={resolvedId}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				{...(control?.invalid ? { 'data-invalid': '', 'aria-invalid': true } : {})}
				className={cn(checkboxInputVariants(), className)}
				{...props}
			/>
			{icon ?? (
				<Check
					data-slot="checkbox-check"
					aria-hidden="true"
					className="pointer-events-none absolute size-3.5 stroke-(--checkbox-check) opacity-0"
					strokeWidth={2}
				/>
			)}
		</label>
	)
}

export type CheckboxGroupProps = React.ComponentPropsWithoutRef<'div'>

export function CheckboxGroup(props: CheckboxGroupProps) {
	return <ToggleGroup {...props} />
}

export type CheckboxFieldProps = React.ComponentPropsWithoutRef<'div'>

export function CheckboxField({ className, ...props }: CheckboxFieldProps) {
	return <ToggleField className={cn(k.disabled, className)} {...props} />
}
