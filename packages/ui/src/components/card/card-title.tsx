import { cn } from '../../core'
import { k } from './variants'

export type CardTitleProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'h3'>, 'className'>

export function CardTitle({ className, children, ...props }: CardTitleProps) {
	return (
		<h3 data-slot="card-title" className={cn(k.title, className)} {...props}>
			{children}
		</h3>
	)
}
