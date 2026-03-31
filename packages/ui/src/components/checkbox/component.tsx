import { cn } from '../../core'
import { ToggleField, ToggleGroup } from '../../primitives'
import { type CheckboxVariants, checkboxColorVariants, checkboxVariants } from './variants'

export type CheckboxProps = CheckboxVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Checkbox({ className, color, ...props }: CheckboxProps) {
	return (
		<span
			data-slot="control"
			className={cn(
				'relative inline-flex size-4.5 items-center justify-center has-checked:*:data-[slot=checkbox-check]:opacity-100',
				checkboxColorVariants({ color }),
			)}
		>
			<input
				type="checkbox"
				data-slot="checkbox"
				className={cn(checkboxVariants(), className)}
				{...props}
			/>
			<svg
				data-slot="checkbox-check"
				className="pointer-events-none absolute size-3 text-(--checkbox-check) opacity-0"
				viewBox="0 0 14 14"
				fill="none"
				aria-hidden="true"
			>
				<path
					d="M3 8L6 11L11 3.5"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
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
