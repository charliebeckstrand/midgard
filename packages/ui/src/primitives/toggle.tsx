import { cn } from '../core'
import { narabi } from '../recipes'

export type ToggleGroupProps = {
	className?: string
	role?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'role'>

export function ToggleGroup({ className, role, ...props }: ToggleGroupProps) {
	return <div data-slot="control" role={role} className={cn(narabi.group, className)} {...props} />
}

export type ToggleFieldProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function ToggleField({ className, ...props }: ToggleFieldProps) {
	return <div data-slot="field" className={cn(narabi.toggle, className)} {...props} />
}
