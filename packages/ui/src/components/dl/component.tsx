import { cn } from '../../core'
import {
	descriptionDetailsVariants,
	descriptionListVariants,
	descriptionTermVariants,
} from './variants'

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
	return (
		<dl
			data-slot="description-list"
			className={cn(descriptionListVariants(), className)}
			{...props}
		/>
	)
}

export function DescriptionTerm({ className, ...props }: DescriptionTermProps) {
	return (
		<dt
			data-slot="description-term"
			className={cn(descriptionTermVariants(), className)}
			{...props}
		/>
	)
}

export function DescriptionDetails({ className, ...props }: DescriptionDetailsProps) {
	return (
		<dd
			data-slot="description-details"
			className={cn(descriptionDetailsVariants(), className)}
			{...props}
		/>
	)
}
