import { cn } from '../../core'
import { descriptionVariants } from './variants'

export type DescriptionProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function Description({ className, ...props }: DescriptionProps) {
	return <p data-slot="description" className={cn(descriptionVariants(), className)} {...props} />
}
