import { cn } from '../../core'
import { k } from './variants'

export type StatLabelProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function StatLabel({ className, children, ...props }: StatLabelProps) {
	return (
		<div data-slot="stat-label" className={cn(k.label, className)} {...props}>
			{children}
		</div>
	)
}
