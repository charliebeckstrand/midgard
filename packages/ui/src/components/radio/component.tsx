import { cn } from '../../core'
import { ToggleField, ToggleGroup } from '../../primitives'
import { kokkaku } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import {
	k,
	type RadioVariants,
	radioColorVariants,
	radioInputVariants,
	radioVariants,
} from './variants'

export type RadioProps = RadioVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Radio({ className, color, ...props }: RadioProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.radio.base, className)} />
	}

	return (
		<label
			data-slot="control"
			className={cn(k.wrapper, radioVariants(), radioColorVariants({ color }))}
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
				className="absolute size-1.5 rounded-full bg-(--radio-checked-indicator) opacity-0 pointer-events-none"
			/>
		</label>
	)
}

export type RadioGroupProps = React.ComponentPropsWithoutRef<'div'>

export function RadioGroup(props: RadioGroupProps) {
	return <ToggleGroup role="radiogroup" {...props} />
}

export type RadioFieldProps = React.ComponentPropsWithoutRef<'div'>

export function RadioField({ className, ...props }: RadioFieldProps) {
	return <ToggleField className={cn(k.disabled, className)} {...props} />
}
