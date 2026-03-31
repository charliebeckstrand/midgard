import { cn } from '../../core'
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
				'has-[:checked]:*:data-[slot=thumb]:left-5',
				'has-[:checked]:*:data-[slot=thumb]:bg-(--switch)',
				'has-[:checked]:*:data-[slot=thumb]:shadow-(--switch-shadow)',
				'has-[:checked]:*:data-[slot=thumb]:ring-(--switch-ring)',
				switchColorVariants({ color }),
			)}
		>
			<input
				type="checkbox"
				data-slot="switch"
				className={cn(switchVariants(), className)}
				{...props}
			/>
			<span data-slot="thumb" aria-hidden="true" className={switchThumbVariants()} />
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
				'grid grid-cols-[2.5rem_1fr] items-center gap-x-4 gap-y-1',
				'*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1',
				'*:data-[slot=label]:col-start-2 *:data-[slot=label]:row-start-1',
				'*:data-[slot=description]:col-start-2 *:data-[slot=description]:row-start-2',
				className,
			)}
			{...props}
		/>
	)
}
