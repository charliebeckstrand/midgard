import { cn } from '../../core'
import { narabi } from '../../recipes'
import { type SwitchVariants, switchThumbVariants, switchVariants } from './variants'

export type SwitchProps = SwitchVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type'>

export function Switch({ className, color, ...props }: SwitchProps) {
	return (
		<span data-slot="control" className="relative inline-flex h-6 w-10 items-center">
			<input
				type="checkbox"
				data-slot="switch"
				className={cn(switchVariants({ color }), 'appearance-none', className)}
				{...props}
			/>
			<span aria-hidden="true" className={switchThumbVariants()} />
		</span>
	)
}

export type SwitchFieldProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function SwitchField({ className, ...props }: SwitchFieldProps) {
	return <div data-slot="field" className={cn(narabi.toggle, className)} {...props} />
}
