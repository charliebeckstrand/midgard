import { cn } from '../../core'
import { fieldsetVariants, legendVariants } from './variants'

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
