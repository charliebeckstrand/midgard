import { cn } from '../../core'
import { kokkaku, narabi } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import {
	type SwitchFieldVariants,
	type SwitchVariants,
	k,
	switchColorVariants,
	switchFieldVariants,
	switchInputVariants,
	switchThumbVariants,
	switchVariants,
} from './variants'

export type SwitchProps = SwitchVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

export function Switch({ className, color, size, ...props }: SwitchProps) {
	if (useSkeleton()) {
		return (
			<Placeholder
				className={cn(kokkaku.switch.base, kokkaku.switch.size[size ?? 'md'], className)}
			/>
		)
	}

	return (
		<label
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
		</label>
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
