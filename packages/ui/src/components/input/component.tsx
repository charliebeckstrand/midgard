import { cn } from '../../core'
import {
	type InputVariants,
	inputControlVariants,
	inputDateVariants,
	inputVariants,
} from './variants'

const DATE_TYPES = new Set(['date', 'datetime-local', 'month', 'time', 'week'])

export type InputProps = InputVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className'>

export function Input({ className, type, ...props }: InputProps) {
	const isDate = DATE_TYPES.has(type ?? '')

	return (
		<span data-slot="control" className={inputControlVariants()}>
			<input
				data-slot="input"
				type={type}
				className={cn(inputVariants(), isDate && inputDateVariants(), className)}
				{...props}
			/>
		</span>
	)
}
