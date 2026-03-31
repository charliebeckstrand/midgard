import { cn } from '../../core'
import { fieldVariants } from './variants'

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
