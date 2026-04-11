import { cn } from '../../core'
import { katachi, maru, narabi } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
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

const skeletonSize = { sm: 'h-5 w-8', md: 'h-6 w-10', lg: 'h-7 w-12' } as const

export type SwitchProps = SwitchVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

export function Switch({ className, color, size, ...props }: SwitchProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(skeletonSize[size ?? 'md'], maru.roundedFull, className)} />
	}

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
