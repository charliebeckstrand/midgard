import { cn } from '../../core'
import { k } from './variants'

export type CardBodyProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function CardBody({ className, children, ...props }: CardBodyProps) {
	return (
		<div data-slot="card-body" className={cn(k.body, className)} {...props}>
			{children}
		</div>
	)
}
