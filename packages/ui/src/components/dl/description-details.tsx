import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useDlOrientation } from './context'
import { dlDetailsVariants } from './variants'

export type DescriptionDetailsProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dd'>, 'className'>

export function DescriptionDetails({ className, ...props }: DescriptionDetailsProps) {
	const orientation = useDlOrientation()

	return (
		<dd
			data-slot="dl-details"
			className={cn(dlDetailsVariants({ orientation }), className)}
			{...props}
		/>
	)
}
