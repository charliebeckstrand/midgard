'use client'

import { Check, Minus } from 'lucide-react'
import { useCallback, useRef } from 'react'
import { cn } from '../../core'
import { ToggleField, ToggleGroup } from '../../primitives'
import { kokkaku } from '../../recipes'
import { useControl } from '../control/context'
import { useFormToggle } from '../form/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import {
	type CheckboxVariants,
	checkboxColorVariants,
	checkboxInputVariants,
	checkboxVariants,
	k,
} from './variants'

export type CheckboxProps = CheckboxVariants & {
	indeterminate?: boolean
	icon?: React.ReactNode
	className?: string
} & Omit<React.ComponentPropsWithRef<'input'>, 'className' | 'type'>

export function Checkbox({
	className,
	color,
	icon,
	indeterminate,
	id,
	disabled,
	required,
	ref,
	name,
	checked,
	onChange,
	...props
}: CheckboxProps) {
	const control = useControl()
	const binding = useFormToggle(name, { onChange })

	const internalRef = useRef<HTMLInputElement>(null)

	const resolvedId = id ?? control?.id

	const resolvedDisabled = disabled ?? control?.disabled
	const resolvedRequired = required ?? control?.required

	const resolvedInvalid = control?.invalid || binding?.invalid

	const setRef = useCallback(
		(el: HTMLInputElement | null) => {
			internalRef.current = el
			if (el) el.indeterminate = !!indeterminate
			if (typeof ref === 'function') ref(el)
			else if (ref) ref.current = el
		},
		[indeterminate, ref],
	)

	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.checkbox.base, className)} />
	}

	return (
		<label
			data-slot="control"
			className={cn(k.wrapper, checkboxVariants(), checkboxColorVariants({ color }), className)}
		>
			<input
				type="checkbox"
				data-slot="checkbox"
				ref={setRef}
				id={resolvedId}
				name={name}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				checked={binding?.checked ?? checked}
				onChange={binding?.onChange ?? onChange}
				{...(resolvedInvalid ? { 'data-invalid': '', 'aria-invalid': true } : {})}
				className={checkboxInputVariants()}
				{...props}
			/>
			{indeterminate
				? (icon ?? (
						<Minus
							data-slot="checkbox-check"
							aria-hidden="true"
							className="pointer-events-none absolute size-3.5 stroke-(--checkbox-check) opacity-0"
							strokeWidth={2}
						/>
					))
				: (icon ?? (
						<Check
							data-slot="checkbox-check"
							aria-hidden="true"
							className="pointer-events-none absolute size-3.5 stroke-(--checkbox-check) opacity-0"
							strokeWidth={2}
						/>
					))}
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
