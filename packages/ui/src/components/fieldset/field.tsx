'use client'

import { type ComponentPropsWithoutRef, useMemo } from 'react'
import { cn } from '../../core'
import { useA11yControl } from '../../hooks'
import { useIdScope } from '../../hooks/use-id-scope'
import { k } from '../../recipes/kata/fieldset'
import { ControlContext, type ControlContextValue, useControl } from '../control/context'

export type FieldProps = {
	autoComplete?: string
	className?: string
	disabled?: boolean
	htmlFor?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function Field({ autoComplete, className, disabled, htmlFor, ...props }: FieldProps) {
	const parent = useControl()

	const scope = useIdScope({ id: htmlFor })

	const a11y = useA11yControl(scope.id)

	const value = useMemo<ControlContextValue>(
		() => ({
			id: scope.id,
			autoComplete: autoComplete ?? parent?.autoComplete,
			disabled: disabled || parent?.disabled,
			invalid: parent?.invalid,
			readOnly: parent?.readOnly,
			required: parent?.required,
			size: parent?.size,
			variant: parent?.variant,
			...a11y,
		}),
		[scope.id, autoComplete, disabled, parent, a11y],
	)

	return (
		<ControlContext value={value}>
			<div
				data-slot="field"
				{...(disabled || parent?.disabled ? { 'data-disabled': true } : {})}
				className={cn(k.field, className)}
				{...props}
			/>
		</ControlContext>
	)
}
