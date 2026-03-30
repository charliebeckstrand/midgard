import { cn } from '../../core'
import { inputControlVariants, inputDateVariants, inputVariants, type InputVariants } from './variants'

type DateType = 'date' | 'datetime-local' | 'month' | 'time' | 'week'

export type InputProps = InputVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className'>

export function Input({ className, type, ...props }: InputProps) {
	const isDate = (
		['date', 'datetime-local', 'month', 'time', 'week'] as string[]
	).includes(type ?? '')

	return (
		<span data-slot="control" className={inputControlVariants()}>
			<input
				data-slot="input"
				type={type}
				className={cn(
					inputVariants(),
					isDate && inputDateVariants(),
					className,
				)}
				{...props}
			/>
		</span>
	)
}
