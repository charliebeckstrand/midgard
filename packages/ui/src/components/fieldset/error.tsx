import { cn } from '../../core'
import { errorVariants } from './variants'

export type ErrorMessageProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function ErrorMessage({ className, ...props }: ErrorMessageProps) {
	return <p data-slot="error" className={cn(errorVariants(), className)} {...props} />
}
