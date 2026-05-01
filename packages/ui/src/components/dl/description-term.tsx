import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useDlOrientation } from './context'
import { dlTermVariants } from './variants'

export type DescriptionTermProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dt'>, 'className'>

export function DescriptionTerm({ className, ...props }: DescriptionTermProps) {
	const orientation = useDlOrientation()

	return (
		<dt data-slot="dl-term" className={cn(dlTermVariants({ orientation }), className)} {...props} />
	)
}
