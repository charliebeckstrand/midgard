'use client'

import { useMemo } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { type ControlContextValue, ControlProvider, useControl } from '../control/context'
import { useFormField } from '../form/context'
import { k } from './variants'

export type FieldsetProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'fieldset'>, 'className'>

export function Fieldset({ className, ...props }: FieldsetProps) {
	return <fieldset data-slot="fieldset" className={cn(k.base, className)} {...props} />
}

export type LegendProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'legend'>, 'className'>

export function Legend({ className, ...props }: LegendProps) {
	return <legend data-slot="legend" className={cn(k.legend, className)} {...props} />
}

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

export type LabelProps = {
	className?: string
	htmlFor?: string
} & Omit<React.ComponentPropsWithoutRef<'label'>, 'className'>

export function Label({ className, htmlFor, ...props }: LabelProps) {
	const control = useControl()
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is passed by the consumer or the label wraps its control
		<label
			data-slot="label"
			htmlFor={htmlFor ?? control?.id}
			className={cn(k.label, className)}
			{...props}
		/>
	)
}

export type DescriptionProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function Description({ className, id, ...props }: DescriptionProps) {
	const control = useControl()
	return (
		<p
			data-slot="description"
			id={id ?? (control ? `${control.id}-description` : undefined)}
			className={cn(k.description, className)}
			{...props}
		/>
	)
}

export type ErrorMessageProps = {
	className?: string
	name?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className' | 'name'>

export function ErrorMessage({ className, id, name, children, ...props }: ErrorMessageProps) {
	const control = useControl()
	const field = useFormField(name)

	const content = field !== undefined ? field.error : children

	// When form-bound, only render if there is an error
	if (field !== undefined && !field.error) return null

	return (
		<p
			data-slot="error"
			id={id ?? (control ? `${control.id}-error` : undefined)}
			className={cn(k.error, className)}
			{...props}
		>
			{content}
		</p>
	)
}
