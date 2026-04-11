import { Check } from 'lucide-react'
import { cn } from '../../core'
import { ToggleField, ToggleGroup } from '../../primitives'
import { katachi } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import {
	type CheckboxVariants,
	checkboxColorVariants,
	checkboxInputVariants,
	checkboxVariants,
} from './variants'

const k = katachi.checkbox

export type CheckboxProps = CheckboxVariants & {
	icon?: React.ReactNode
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Checkbox({ className, color, icon, ...props }: CheckboxProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn('size-4.5 rounded-[--spacing(1)]', className)} />
	}

	return (
		<span
			data-slot="control"
			className={cn(k.wrapper, checkboxVariants(), checkboxColorVariants({ color }))}
		>
			<input
				type="checkbox"
				data-slot="checkbox"
				className={cn(checkboxInputVariants(), className)}
				{...props}
			/>
			{icon ?? (
				<Check
					data-slot="checkbox-check"
					aria-hidden="true"
					className="pointer-events-none absolute size-3.5 stroke-(--checkbox-check) opacity-0"
					strokeWidth={2}
				/>
			)}
		</span>
	)
}

export type CheckboxGroupProps = React.ComponentPropsWithoutRef<'div'> & { className?: string }

export function CheckboxGroup(props: CheckboxGroupProps) {
	return <ToggleGroup {...props} />
}

export type CheckboxFieldProps = React.ComponentPropsWithoutRef<'div'> & { className?: string }

export function CheckboxField({ className, ...props }: CheckboxFieldProps) {
	return <ToggleField className={cn(k.disabled, className)} {...props} />
}
