import { cn } from '../../core'
import { ToggleField, ToggleGroup } from '../../primitives'
import {
	type RadioVariants,
	radioColorVariants,
	radioInputVariants,
	radioVariants,
} from './variants'

export type RadioProps = RadioVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Radio({ className, color, ...props }: RadioProps) {
	return (
		<span
			data-slot="control"
			className={cn(
				'relative inline-flex size-4.5 items-center justify-center',
				'has-checked:*:data-[slot=radio-indicator]:opacity-100',
				'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600',
				radioVariants(),
				radioColorVariants({ color }),
			)}
		>
			<input
				type="radio"
				data-slot="radio"
				className={cn(radioInputVariants(), className)}
				{...props}
			/>
			<span
				data-slot="radio-indicator"
				aria-hidden="true"
				className="pointer-events-none absolute size-1.5 rounded-full bg-(--radio-checked-indicator) opacity-0"
			/>
		</span>
	)
}

export type RadioGroupProps = React.ComponentPropsWithoutRef<'div'> & { className?: string }

export function RadioGroup(props: RadioGroupProps) {
	return <ToggleGroup role="radiogroup" {...props} />
}

export type RadioFieldProps = React.ComponentPropsWithoutRef<'div'> & { className?: string }

export function RadioField(props: RadioFieldProps) {
	return <ToggleField {...props} />
}
