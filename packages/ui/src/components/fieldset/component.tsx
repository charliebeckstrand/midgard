import { cn } from '../../core'
import {
	descriptionVariants,
	errorVariants,
	fieldsetVariants,
	fieldVariants,
	labelVariants,
	legendVariants,
} from './variants'

export type FieldsetProps = {
	className?: string
	disabled?: boolean
} & Omit<React.ComponentPropsWithoutRef<'fieldset'>, 'className'>

export function Fieldset({ className, ...props }: FieldsetProps) {
	return <fieldset data-slot="fieldset" className={cn(fieldsetVariants(), className)} {...props} />
}

export type LegendProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'legend'>, 'className'>

export function Legend({ className, ...props }: LegendProps) {
	return <legend data-slot="legend" className={cn(legendVariants(), className)} {...props} />
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
			className={cn(fieldVariants(), className)}
			{...props}
		/>
	)
}

export type LabelProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'label'>, 'className'>

export function Label({ className, ...props }: LabelProps) {
	// biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is passed via ...props by the consumer
	return <label data-slot="label" className={cn(labelVariants(), className)} {...props} />
}

export type DescriptionProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function Description({ className, ...props }: DescriptionProps) {
	return <p data-slot="description" className={cn(descriptionVariants(), className)} {...props} />
}

export type ErrorMessageProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function ErrorMessage({ className, ...props }: ErrorMessageProps) {
	return <p data-slot="error" className={cn(errorVariants(), className)} {...props} />
}
