import { cn } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.fieldset

export type FieldsetProps = {
	className?: string
	disabled?: boolean
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
} & Omit<React.ComponentPropsWithoutRef<'label'>, 'className'>

export function Label({ className, ...props }: LabelProps) {
	// biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is passed via ...props by the consumer
	return <label data-slot="label" className={cn(k.label, className)} {...props} />
}

export type DescriptionProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function Description({ className, ...props }: DescriptionProps) {
	return <p data-slot="description" className={cn(k.description, className)} {...props} />
}

export type ErrorMessageProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function ErrorMessage({ className, ...props }: ErrorMessageProps) {
	return <p data-slot="error" className={cn(k.error, className)} {...props} />
}
