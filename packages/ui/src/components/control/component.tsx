'use client'

import { useId, useMemo } from 'react'
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { type ControlContextValue, ControlProvider } from './context'

const k = katachi.fieldset

export type ControlProps = {
	id?: string
	disabled?: boolean
	invalid?: boolean
	readOnly?: boolean
	required?: boolean
	className?: string
	children: React.ReactNode
}

/**
 * Context wrapper for form fields and interactive groups.
 *
 * Generates a stable id and propagates `disabled`, `invalid`, `readOnly`,
 * and `required` state to control-aware children (Label, Input, Textarea,
 * Description, ErrorMessage).
 *
 *     <Control required>
 *       <Label>Email</Label>
 *       <Input type="email" />
 *       <ErrorMessage>Required</ErrorMessage>
 *     </Control>
 */
export function Control({
	id: idProp,
	disabled,
	invalid,
	readOnly,
	required,
	className,
	children,
}: ControlProps) {
	const generatedId = useId()

	const id = idProp ?? generatedId

	const value = useMemo<ControlContextValue>(
		() => ({ id, disabled, invalid, readOnly, required }),
		[id, disabled, invalid, readOnly, required],
	)

	return (
		<ControlProvider value={value}>
			<div
				data-slot="field"
				{...(disabled ? { 'data-disabled': true } : {})}
				className={cn(k.field, className)}
			>
				{children}
			</div>
		</ControlProvider>
	)
}
