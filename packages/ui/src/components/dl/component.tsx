import { cn } from '../../core'
import { k } from './variants'

export type DescriptionListVariants = Record<string, never>

export type DescriptionListProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'dl'>, 'className'>

export type DescriptionTermProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'dt'>, 'className'>

export type DescriptionDetailsProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'dd'>, 'className'>

export function DescriptionList({ className, ...props }: DescriptionListProps) {
	return <dl data-slot="dl" className={cn(k.base, className)} {...props} />
}

export function DescriptionTerm({ className, ...props }: DescriptionTermProps) {
	return <dt data-slot="dl-term" className={cn(k.term, className)} {...props} />
}

export function DescriptionDetails({ className, ...props }: DescriptionDetailsProps) {
	return <dd data-slot="dl-details" className={cn(k.details, className)} {...props} />
}
