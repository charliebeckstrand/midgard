import { cn } from '../../core'
import { katachi, narabi } from '../../recipes'
import {
	type SwitchFieldVariants,
	type SwitchVariants,
	switchColorVariants,
	switchFieldVariants,
	switchInputVariants,
	switchThumbVariants,
	switchVariants,
} from './variants'

const k = katachi.switch

export type SwitchProps = SwitchVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

export function Switch({ className, color, size, ...props }: SwitchProps) {
	return (
		<span
			data-slot="control"
			className={cn(k.wrapper, switchVariants({ size }), switchColorVariants({ color }))}
		>
			<input
				type="checkbox"
				data-slot="switch"
				className={cn(switchInputVariants(), className)}
				{...props}
			/>
			<span data-slot="switch-thumb" aria-hidden="true" className={switchThumbVariants()} />
		</span>
	)
}

export type SwitchFieldProps = SwitchFieldVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function SwitchField({ className, size, ...props }: SwitchFieldProps) {
	return (
		<div
			data-slot="field"
			className={cn(narabi.toggle, switchFieldVariants({ size }), k.disabled, className)}
			{...props}
		/>
	)
}
