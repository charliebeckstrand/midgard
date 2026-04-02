import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../core'
import { kage, sumi } from '../../recipes'

export const descriptionListVariants = cva(
	'grid grid-cols-1 text-sm/6 sm:grid-cols-[min(50%,--spacing(56))_auto]',
)

export const descriptionTermVariants = cva([
	sumi.textMuted,
	kage.borderSubtle,
	'col-start-1 border-t pt-3 first:border-none first:pt-0',
	'sm:py-3 sm:first:pt-0',
	'font-medium',
])

export const descriptionDetailsVariants = cva([
	sumi.text,
	kage.borderSubtle,
	'pb-3 pt-1',
	'sm:border-t sm:py-3',
	'sm:nth-2:border-none',
])

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
