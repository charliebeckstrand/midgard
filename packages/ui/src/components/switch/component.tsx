import { cn } from '../../core'
import { narabi } from '../../recipes'
import { switchThumbVariants, switchVariants, type SwitchVariants } from './variants'

export type SwitchProps = SwitchVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Switch({ className, color, ...props }: SwitchProps) {
	return (
		<span
			data-slot="control"
			className="relative inline-flex items-center"
		>
			<input
				type="checkbox"
				role="switch"
				data-slot="switch"
				className="peer sr-only"
				{...props}
			/>
			<span
				aria-hidden="true"
				className={cn(
					switchVariants({ color }),
					'peer-checked:data-checked peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600',
					'peer-disabled:opacity-50 peer-disabled:cursor-default',
					className,
				)}
				data-checked={undefined}
			>
				<span className={switchThumbVariants()} />
			</span>
		</span>
	)
}

export type SwitchFieldProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function SwitchField({ className, ...props }: SwitchFieldProps) {
	return (
		<div
			data-slot="field"
			className={cn(narabi.toggle, className)}
			{...props}
		/>
	)
}
