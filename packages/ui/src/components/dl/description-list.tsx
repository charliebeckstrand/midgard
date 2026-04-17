import { cn } from '../../core'
import { k } from './variants'

export type DescriptionListVariants = Record<string, never>

export type DescriptionListProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'dl'>, 'className'>

export function DescriptionList({ className, ...props }: DescriptionListProps) {
	return <dl data-slot="dl" className={cn(k.base, className)} {...props} />
}
