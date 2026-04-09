import { cn } from '../../core'
import { katachi, narabi } from '../../recipes'
import {
	type SwitchVariants,
	switchColorVariants,
	switchInputVariants,
	switchThumbVariants,
	switchVariants,
} from './variants'

const k = katachi.switch

export type SwitchProps = SwitchVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Switch({ className, color, ...props }: SwitchProps) {
	return (
		<span
			data-slot="control"
			className={cn(k.wrapper, switchVariants(), switchColorVariants({ color }))}
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

export type SwitchFieldProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function SwitchField({ className, ...props }: SwitchFieldProps) {
	return <div data-slot="field" className={cn(narabi.toggle, k.field, className)} {...props} />
}
