import { cn } from '../../core'
import { FormControl } from '../../primitives'
import { type InputVariants, inputDateVariants, inputVariants } from './variants'

const DATE_TYPES = new Set(['date', 'datetime-local', 'month', 'time', 'week'])

export type InputProps = InputVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className'>

const outlineControl = 'bg-transparent dark:bg-transparent before:shadow-none'

export function Input({ className, type, variant, ...props }: InputProps) {
	const isDate = DATE_TYPES.has(type ?? '')

	return (
		<FormControl className={cn(variant === 'outline' && outlineControl)}>
			<input
				data-slot="input"
				type={type}
				className={cn(inputVariants({ variant }), isDate && inputDateVariants(), className)}
				{...props}
			/>
		</FormControl>
	)
}
