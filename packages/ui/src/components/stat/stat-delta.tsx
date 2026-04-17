import { cn } from '../../core'
import { type StatDeltaVariants, statDeltaVariants } from './variants'

export type StatDeltaProps = StatDeltaVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function StatDelta({ trend, className, children, ...props }: StatDeltaProps) {
	return (
		<div data-slot="stat-delta" className={cn(statDeltaVariants({ trend }), className)} {...props}>
			{children}
		</div>
	)
}
