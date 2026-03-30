import { cn } from '../../core'
import { narabi } from '../../recipes'
import { type CheckboxVariants, checkboxVariants } from './variants'

export type CheckboxProps = CheckboxVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Checkbox({ className, color, ...props }: CheckboxProps) {
	return (
		<span data-slot="control" className="relative inline-flex items-center justify-center">
			<input
				type="checkbox"
				data-slot="checkbox"
				className={cn(checkboxVariants({ color }), 'appearance-none', className)}
				{...props}
			/>
			<svg
				className="pointer-events-none absolute size-3.5 opacity-0 [:checked+&]:opacity-100 sm:size-3"
				viewBox="0 0 14 14"
				fill="none"
				aria-hidden="true"
			>
				<path
					d="M3 8L6 11L11 3.5"
					className="stroke-(--checkbox-check)"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</span>
	)
}

export type CheckboxGroupProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function CheckboxGroup({ className, ...props }: CheckboxGroupProps) {
	return <fieldset data-slot="control" className={cn(narabi.group, className)} {...props} />
}

export type CheckboxFieldProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function CheckboxField({ className, ...props }: CheckboxFieldProps) {
	return <div data-slot="field" className={cn(narabi.toggle, className)} {...props} />
}
