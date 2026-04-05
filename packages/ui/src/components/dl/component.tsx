import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.dl

export const descriptionListVariants = cva(k.root)

export const descriptionTermVariants = cva(k.term)

export const descriptionDetailsVariants = cva(k.details)

export type DescriptionListVariants = VariantProps<typeof descriptionListVariants>

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
	return <dl data-slot="dl" className={cn(descriptionListVariants(), className)} {...props} />
}

export function DescriptionTerm({ className, ...props }: DescriptionTermProps) {
	return <dt data-slot="dl-term" className={cn(descriptionTermVariants(), className)} {...props} />
}

export function DescriptionDetails({ className, ...props }: DescriptionDetailsProps) {
	return (
		<dd data-slot="dl-details" className={cn(descriptionDetailsVariants(), className)} {...props} />
	)
}
