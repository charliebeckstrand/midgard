import { cn } from '../../core'
import { narabi } from '../../recipes'
import { type RadioVariants, radioVariants } from './variants'

export type RadioProps = RadioVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Radio({ className, color, ...props }: RadioProps) {
	return (
		<span data-slot="control" className="relative inline-flex items-center justify-center">
			<input
				type="radio"
				data-slot="radio"
				className={cn(radioVariants({ color }), 'appearance-none', className)}
				{...props}
			/>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute size-1.5 rounded-full bg-(--radio-checked-indicator) opacity-0 [:checked+&]:opacity-100 sm:size-1"
			/>
		</span>
	)
}

export type RadioGroupProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function RadioGroup({ className, ...props }: RadioGroupProps) {
	return (
		<div data-slot="control" role="radiogroup" className={cn(narabi.group, className)} {...props} />
	)
}

export type RadioFieldProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function RadioField({ className, ...props }: RadioFieldProps) {
	return <div data-slot="field" className={cn(narabi.toggle, className)} {...props} />
}
