'use client'

import { cn } from '../../core'
import { useControl } from '../control/context'
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
	className?: string
	disabled?: boolean
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function Field({ className, disabled, ...props }: FieldProps) {
	return (
		<div
			data-slot="field"
			{...(disabled ? { 'data-disabled': true } : {})}
			className={cn(k.field, className)}
			{...props}
		/>
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
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function ErrorMessage({ className, id, ...props }: ErrorMessageProps) {
	const control = useControl()
	return (
		<p
			data-slot="error"
			id={id ?? (control ? `${control.id}-error` : undefined)}
			className={cn(k.error, className)}
			{...props}
		/>
	)
}
