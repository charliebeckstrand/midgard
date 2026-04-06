import { cn } from '../../core'
import { narabi } from '../../recipes'
import {
	type SwitchVariants,
	switchColorVariants,
	switchThumbVariants,
	switchVariants,
} from './variants'

export type SwitchProps = SwitchVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Switch({ className, color, ...props }: SwitchProps) {
	return (
		<span
			data-slot="control"
			className={cn(
				'relative inline-flex h-6 w-10 shrink-0 items-center',
				'has-[:checked]:*:data-[slot=switch-thumb]:left-5',
				'has-[:checked]:*:data-[slot=switch-thumb]:bg-(--switch)',
				'has-[:checked]:*:data-[slot=switch-thumb]:shadow-(--switch-shadow)',
				'has-[:checked]:*:data-[slot=switch-thumb]:ring-(--switch-ring)',
				switchColorVariants({ color }),
			)}
		>
			<input
				type="checkbox"
				data-slot="switch"
				className={cn(switchVariants(), className)}
				{...props}
			/>
			<span data-slot="switch-thumb" aria-hidden="true" className={switchThumbVariants()} />
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
			className={cn(
				narabi.toggle,
				'grid-cols-[2.5rem_1fr] items-center *:data-[slot=control]:mt-0',
				className,
			)}
			{...props}
		/>
	)
}
