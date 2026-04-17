'use client'

import { useMemo } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { type ControlContextValue, ControlProvider, useControl } from '../control/context'
import { k } from './variants'

export type FieldProps = {
	autoComplete?: string
	className?: string
	disabled?: boolean
	htmlFor?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function Field({ autoComplete, className, disabled, htmlFor, ...props }: FieldProps) {
	const parent = useControl()

	const scope = useIdScope({ id: htmlFor })

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
		}),
		[scope.id, autoComplete, disabled, parent],
	)

	return (
		<ControlProvider value={value}>
			<div
				data-slot="field"
				{...(disabled || parent?.disabled ? { 'data-disabled': true } : {})}
				className={cn(k.field, className)}
				{...props}
			/>
		</ControlProvider>
	)
}
