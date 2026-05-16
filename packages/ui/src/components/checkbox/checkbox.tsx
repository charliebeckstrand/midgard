'use client'

import { Check, Minus } from 'lucide-react'
import { type ComponentPropsWithRef, type ReactNode, useCallback, useRef } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { kokkaku } from '../../recipes'
import {
	type CheckboxVariants,
	checkboxCheckSize,
	checkboxInputVariants,
	checkboxVariants,
} from '../../recipes/kata/checkbox'
import { invalidAttrs } from '../control/control-invalid-attrs'
import { useControlFieldProps } from '../control/use-control-field-props'
import { useFormToggle } from '../form/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'

export type CheckboxProps = CheckboxVariants & {
	indeterminate?: boolean
	icon?: ReactNode
	className?: string
} & Omit<ComponentPropsWithRef<'input'>, 'className' | 'type' | 'size'>

export function Checkbox({
	className,
	color,
	size,
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
	const binding = useFormToggle(name, { onChange })

	const {
		id: resolvedId,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		invalid: resolvedInvalid,
	} = useControlFieldProps({ id, disabled, required, binding })

	const internalRef = useRef<HTMLInputElement>(null)

	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

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

	const checkClass = cn(
		'pointer-events-none absolute stroke-(--checkbox-check) opacity-0',
		checkboxCheckSize[resolvedSize],
	)

	return (
		<label
			data-slot="control"
			{...(resolvedDisabled ? { 'data-disabled': true } : {})}
			className={cn(checkboxVariants({ color, size: resolvedSize }), className)}
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
				{...invalidAttrs(resolvedInvalid)}
				className={checkboxInputVariants()}
				{...props}
			/>
			{indeterminate
				? (icon ?? (
						<Minus
							data-slot="checkbox-check"
							aria-hidden="true"
							className={checkClass}
							strokeWidth={2}
						/>
					))
				: (icon ?? (
						<Check
							data-slot="checkbox-check"
							aria-hidden="true"
							className={checkClass}
							strokeWidth={2}
						/>
					))}
		</label>
	)
}
