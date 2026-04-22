import { cn } from '../../core'
import { k } from './variants'

export type TableRowProps = {
	className?: string
	href?: string
} & Omit<React.ComponentPropsWithoutRef<'tr'>, 'className'>

export function TableRow({ className, children, ...props }: TableRowProps) {
	return (
		<tr className={cn(k.row, className)} {...props}>
			{children}
		</tr>
	)
}
