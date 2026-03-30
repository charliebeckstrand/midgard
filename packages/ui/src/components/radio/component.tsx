import { cn } from '../../core'
import { narabi } from '../../recipes'
import { radioVariants, type RadioVariants } from './variants'

export type RadioProps = RadioVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Radio({ className, color, ...props }: RadioProps) {
	return (
		<span
			data-slot="control"
			className="relative inline-flex items-center justify-center"
		>
			<input
				type="radio"
				data-slot="radio"
				className="peer sr-only"
				{...props}
			/>
			<span
				aria-hidden="true"
				className={cn(
					radioVariants({ color }),
					'peer-checked:data-checked peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600',
					'peer-disabled:opacity-50',
					className,
				)}
				data-checked={undefined}
			>
				<span className="size-1.5 rounded-full bg-(--radio-checked-indicator) opacity-0 peer-checked:group-[]:opacity-100 sm:size-1" />
			</span>
		</span>
	)
}

export type RadioGroupProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function RadioGroup({ className, ...props }: RadioGroupProps) {
	return (
		<div
			data-slot="control"
			role="radiogroup"
			className={cn(narabi.group, className)}
			{...props}
		/>
	)
}

export type RadioFieldProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function RadioField({ className, ...props }: RadioFieldProps) {
	return (
		<div
			data-slot="field"
			className={cn(narabi.toggle, className)}
			{...props}
		/>
	)
}
