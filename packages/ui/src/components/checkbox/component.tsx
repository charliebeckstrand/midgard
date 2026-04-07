import { cn } from '../../core'
import { CheckboxIcon } from '../../icons'
import { ToggleField, ToggleGroup } from '../../primitives'
import { type CheckboxVariants, checkboxColorVariants, checkboxVariants } from './variants'

export type CheckboxProps = CheckboxVariants & {
	icon?: React.ReactNode
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Checkbox({ className, color, icon, ...props }: CheckboxProps) {
	return (
		<span
			data-slot="control"
			className={cn(
				'relative inline-flex size-4.5 items-center justify-center rounded-sm has-checked:*:data-[slot=checkbox-check]:opacity-100 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600',
				checkboxColorVariants({ color }),
			)}
		>
			<input
				type="checkbox"
				data-slot="checkbox"
				className={cn(checkboxVariants(), 'focus-visible:ring-0', className)}
				{...props}
			/>
			{icon ?? <CheckboxIcon />}
		</span>
	)
}

export type CheckboxGroupProps = React.ComponentPropsWithoutRef<'div'> & { className?: string }

export function CheckboxGroup(props: CheckboxGroupProps) {
	return <ToggleGroup {...props} />
}

export type CheckboxFieldProps = React.ComponentPropsWithoutRef<'div'> & { className?: string }

export function CheckboxField(props: CheckboxFieldProps) {
	return <ToggleField {...props} />
}
