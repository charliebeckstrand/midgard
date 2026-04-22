import { cn } from '../../core'
import { k } from './variants'

export type TableHeadProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'thead'>, 'className'>

export function TableHead({ className, children, ...props }: TableHeadProps) {
	return (
		<thead className={cn(k.head, className)} {...props}>
			{children}
		</thead>
	)
}
